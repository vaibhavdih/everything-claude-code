---
name: frappe-deployment
description: Advanced Frappe deployment patterns - CI/CD, Docker, multi-server setup, load balancing, and production best practices.
origin: ECC
---

# Frappe Deployment (Advanced)

Advanced deployment strategies, CI/CD, containerization, and production operations for Frappe.

## When to Activate

- Setting up CI/CD pipelines
- Containerizing Frappe apps
- Multi-server deployments
- Load balancing setup
- High availability configuration
- Production hardening

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          pip install frappe-bench
          bench init --skip-redis-config-generation frappe-bench
          cd frappe-bench
          bench get-app $GITHUB_WORKSPACE

      - name: Run tests
        run: |
          cd frappe-bench
          bench --site test_site run-tests --app custom_app --coverage

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /home/frappe/frappe-bench
            bench update --pull
            bench --site site1.local migrate
            bench build --production
            sudo supervisorctl restart all
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: python:3.10
  script:
    - pip install frappe-bench
    - bench init --skip-redis-config-generation frappe-bench
    - cd frappe-bench && bench get-app $CI_PROJECT_DIR
    - bench --site test_site run-tests --app custom_app
  only:
    - branches

deploy_production:
  stage: deploy
  script:
    - ssh $PROD_USER@$PROD_HOST "cd /home/frappe/frappe-bench && ./deploy.sh"
  only:
    - main
```

## Docker Deployment

### Dockerfile

```dockerfile
# Dockerfile
FROM frappe/erpnext:latest

# Copy custom app
COPY ./custom_app /home/frappe/frappe-bench/apps/custom_app

# Install app
RUN cd /home/frappe/frappe-bench && \
    bench get-app file:///home/frappe/frappe-bench/apps/custom_app && \
    bench --site all install-app custom_app

# Build assets
RUN cd /home/frappe/frappe-bench && \
    bench build --production

EXPOSE 8000

CMD ["bench", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3'

services:
  frappe:
    image: custom_app:latest
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=mariadb
      - REDIS_CACHE=redis://redis-cache:6379
      - REDIS_QUEUE=redis://redis-queue:6379
    depends_on:
      - mariadb
      - redis-cache
      - redis-queue

  mariadb:
    image: mariadb:10.6
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    volumes:
      - mariadb-data:/var/lib/mysql

  redis-cache:
    image: redis:alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  redis-queue:
    image: redis:alpine

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frappe

volumes:
  mariadb-data:
```

## Multi-Server Architecture

### Application Server

```bash
# Server 1, 2, 3: Application servers
# Install Frappe bench
# Configure to connect to central database and Redis
```

```json
// site_config.json
{
    "db_host": "db.internal.example.com",
    "db_port": 3306,
    "db_name": "production_db",
    "db_password": "strong_password",

    "redis_cache": "redis://cache.internal.example.com:6379",
    "redis_queue": "redis://queue.internal.example.com:6379",
    "redis_socketio": "redis://socketio.internal.example.com:6379",

    "gunicorn_workers": 8,
    "background_workers": 0  // No background workers on web servers
}
```

### Database Server

```bash
# Dedicated MariaDB server
# Configure for production load

# /etc/mysql/mariadb.conf.d/50-server.cnf
[mysqld]
innodb_buffer_pool_size = 8G
innodb_log_file_size = 512M
max_connections = 500
query_cache_size = 256M
```

### Queue Server

```bash
# Dedicated server for background jobs
# Configure only workers, no web processes
```

```json
// site_config.json
{
    "background_workers": 8,
    "gunicorn_workers": 0  // No web workers
}
```

### Redis Servers

```bash
# Separate Redis instances
# 1. redis-cache: 6379
# 2. redis-queue: 6380
# 3. redis-socketio: 6381
```

## Load Balancing

### Nginx Load Balancer

```nginx
# /etc/nginx/conf.d/load_balancer.conf
upstream frappe_backend {
    least_conn;  # Load balancing method

    server 192.168.1.10:8000 weight=1 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:8000 weight=1 max_fails=3 fail_timeout=30s;
    server 192.168.1.12:8000 weight=1 max_fails=3 fail_timeout=30s;

    keepalive 32;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://frappe_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files from first server
    location /assets {
        proxy_pass http://192.168.1.10:8000/assets;
    }
}
```

### Health Checks

```nginx
# Add health check endpoint
location /health {
    access_log off;
    return 200 "OK\n";
    add_header Content-Type text/plain;
}

# In upstream
upstream frappe_backend {
    server 192.168.1.10:8000 max_fails=3 fail_timeout=30s;

    # Health check (with nginx plus or module)
    check interval=5000 rise=2 fall=3 timeout=3000;
}
```

## High Availability

### Database Replication

```bash
# Master-Slave replication
# Master: db1.example.com
# Slave: db2.example.com

# Configure read replicas for reporting
```

```python
# Use read replica for reports
@frappe.whitelist()
def get_heavy_report():
    """Use read replica for heavy queries"""

    # Connect to read replica
    replica_db = frappe.get_db("replica")

    data = replica_db.sql("""
        SELECT * FROM `tabSales Order`
        WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
    """, as_dict=True)

    return data
```

### Session Persistence

```nginx
# Sticky sessions for websocket
upstream frappe_backend {
    ip_hash;  # Session persistence

    server 192.168.1.10:8000;
    server 192.168.1.11:8000;
}
```

### Failover Configuration

```bash
# Setup automatic failover
# Use keepalived or similar

# /etc/keepalived/keepalived.conf
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    virtual_ipaddress {
        192.168.1.100
    }
}
```

## Zero-Downtime Deployment

### Rolling Updates

```bash
#!/bin/bash
# deploy.sh - Rolling deployment script

SERVERS=("192.168.1.10" "192.168.1.11" "192.168.1.12")

for server in "${SERVERS[@]}"; do
    echo "Deploying to $server"

    # Remove from load balancer
    ssh lb.example.com "nginx -s reload"  # After removing server from upstream

    # Deploy
    ssh frappe@$server "cd /home/frappe/frappe-bench && \
        bench update --pull && \
        bench --site site1.local migrate && \
        bench build --production && \
        sudo supervisorctl restart all"

    # Add back to load balancer
    ssh lb.example.com "nginx -s reload"  # After adding server back

    # Wait before next server
    sleep 30
done
```

### Blue-Green Deployment

```bash
# Maintain two identical environments
# Blue (current production)
# Green (new version)

# 1. Deploy to Green environment
# 2. Test Green thoroughly
# 3. Switch load balancer to Green
# 4. Keep Blue as rollback option
```

## Monitoring & Alerting

### Prometheus + Grafana

```python
# Export metrics
from prometheus_client import Counter, Histogram

request_count = Counter('frappe_requests_total', 'Total requests')
request_duration = Histogram('frappe_request_duration_seconds', 'Request duration')

@frappe.whitelist()
def monitored_api():
    with request_duration.time():
        request_count.inc()
        return process_request()
```

### Custom Health Endpoint

```python
@frappe.whitelist(allow_guest=True)
def health_check():
    """Health check endpoint"""

    checks = {
        "database": check_database(),
        "redis": check_redis(),
        "queue": check_queue(),
        "disk_space": check_disk_space()
    }

    all_healthy = all(checks.values())

    frappe.response.http_status_code = 200 if all_healthy else 503

    return {
        "status": "healthy" if all_healthy else "unhealthy",
        "checks": checks
    }

def check_database():
    try:
        frappe.db.sql("SELECT 1")
        return True
    except:
        return False
```

## Security Hardening

### SSL/TLS Configuration

```nginx
# Strong SSL configuration
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Firewall Rules

```bash
# UFW rules
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3306/tcp   # Block external DB access
sudo ufw deny 6379/tcp   # Block external Redis access
sudo ufw enable
```

### Secrets Management

```bash
# Use environment variables or secret manager
# Never commit secrets to git

# Example: AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id frappe/db_password
```

## Backup Strategy

### Automated Backups

```bash
# Crontab
# Daily backup at 2 AM
0 2 * * * /home/frappe/scripts/backup.sh

# Weekly full backup
0 3 * * 0 /home/frappe/scripts/full_backup.sh

# Monthly archive
0 4 1 * * /home/frappe/scripts/archive_backup.sh
```

### Backup Script

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/daily"
SITE="site1.local"

# Create backup
cd /home/frappe/frappe-bench
bench --site $SITE backup --with-files --backup-path $BACKUP_DIR

# Compress
gzip $BACKUP_DIR/*$DATE*.sql
tar -czf $BACKUP_DIR/files-$DATE.tar.gz $BACKUP_DIR/private/

# Upload to S3
aws s3 cp $BACKUP_DIR/ s3://backups-bucket/frappe/$DATE/ --recursive

# Delete local backups older than 7 days
find $BACKUP_DIR -mtime +7 -delete
```

## Best Practices

**DO:**
- ✅ Use CI/CD for automated deployments
- ✅ Test deployments on staging first
- ✅ Implement health checks
- ✅ Monitor application metrics
- ✅ Use load balancing for HA
- ✅ Automate backups
- ✅ Harden security (SSL, firewall)
- ✅ Document deployment procedures
- ✅ Use version control for configs
- ✅ Plan for disaster recovery

**DON'T:**
- ❌ Deploy directly to production
- ❌ Skip testing before deployment
- ❌ Ignore monitoring and alerts
- ❌ Use weak SSL configuration
- ❌ Expose internal services
- ❌ Forget to backup before changes
- ❌ Hardcode secrets in code
- ❌ Deploy during peak hours
- ❌ Skip rollback planning

## Deployment Checklist

- [ ] CI/CD pipeline configured
- [ ] Staging environment matches production
- [ ] All tests passing
- [ ] Security scan completed
- [ ] SSL certificates valid
- [ ] Backups automated and tested
- [ ] Monitoring and alerting active
- [ ] Load balancer configured
- [ ] Health checks implemented
- [ ] Rollback procedure documented
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled
