# Frappe Deployment Guidelines

Production deployment checklist and best practices for Frappe applications.

## Pre-Deployment Checklist

### Security Configuration

- [ ] `developer_mode = 0` in production
- [ ] Strong database passwords
- [ ] Unique encryption key per site
- [ ] HTTPS/SSL certificates configured
- [ ] Firewall rules configured
- [ ] No test accounts in production
- [ ] Secrets in environment variables (not in code)
- [ ] `allow_tests = 0` in production

### Performance Configuration

- [ ] Redis configured for caching and queue
- [ ] Gunicorn workers set appropriately (2-4 per CPU core)
- [ ] Database query optimization completed
- [ ] Static assets minified
- [ ] CDN configured for static files (optional)
- [ ] Database indexes created

### Monitoring & Logging

- [ ] Error logging configured
- [ ] Performance monitoring setup
- [ ] Backup verification working
- [ ] Uptime monitoring configured
- [ ] Log rotation configured
- [ ] Disk space monitoring

## Production Setup Commands

### Initial Setup

```bash
# Setup production environment
sudo bench setup production frappe-user

# Setup SSL with Let's Encrypt
sudo bench setup lets-encrypt site1.local

# Enable scheduler
bench --site site1.local enable-scheduler

# Setup supervisor (process monitoring)
sudo bench setup supervisor

# Setup nginx (web server)
sudo bench setup nginx
```

### Site Configuration (site_config.json)

```json
{
    "db_name": "production_db",
    "db_password": "strong_random_password",
    "developer_mode": 0,
    "disable_website_cache": 0,
    "server_script_enabled": 0,
    "allow_tests": 0,
    "encryption_key": "use-strong-random-key-32-chars",
    "mail_server": "smtp.example.com",
    "mail_port": 587,
    "use_ssl": 1,
    "mail_login": "noreply@example.com",
    "mail_password": "email_password",
    "auto_email_id": "noreply@example.com",
    "always_use_account_email_id_as_sender": 1,
    "redis_cache": "redis://localhost:6379",
    "redis_queue": "redis://localhost:6379/1",
    "redis_socketio": "redis://localhost:6379/2",
    "socketio_port": 9000,
    "gunicorn_workers": 4
}
```

## Backup Strategy

### Automated Backups

```bash
# Add to crontab
# Daily backup at 2 AM
0 2 * * * bench --site site1.local backup --with-files

# Weekly full backup on Sunday
0 3 * * 0 bench --site site1.local backup --with-files --backup-path /backups/weekly
```

### Manual Backup

```bash
# Backup database and files
bench --site site1.local backup --with-files

# Backup to specific location
bench --site site1.local backup --backup-path /path/to/backup

# Restore from backup
bench --site site1.local restore /path/to/backup.sql.gz --with-files
```

## Update & Migration Strategy

### Update Procedure

```bash
# 1. Backup first (MANDATORY)
bench --site site1.local backup --with-files

# 2. Pull latest code
bench update --pull

# 3. Update dependencies
bench --site site1.local migrate

# 4. Build assets
bench build --production

# 5. Clear cache
bench --site site1.local clear-cache

# 6. Restart services
bench restart
```

### Zero-Downtime Updates

```bash
# 1. Setup staging environment
# 2. Test updates on staging
# 3. During low-traffic period:

# Backup
bench --site site1.local backup --with-files

# Update without restart
bench update --no-restart

# Migrate database
bench --site site1.local migrate

# Build assets
bench build --production

# Rolling restart workers
sudo supervisorctl restart all
```

## Monitoring

### Log Locations

```bash
# Application logs
tail -f sites/site1.local/logs/web.log
tail -f sites/site1.local/logs/worker.log
tail -f sites/site1.local/logs/error.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Supervisor logs
tail -f /var/log/supervisor/supervisord.log
```

### Health Checks

```bash
# Check bench status
bench doctor

# Check site health
bench --site site1.local doctor

# Check database connectivity
bench --site site1.local mariadb
# Run: SELECT 1;

# Check Redis connectivity
redis-cli ping  # Should return PONG
```

## Performance Optimization

### Database Optimization

```bash
# Analyze slow queries
bench --site site1.local mariadb
# Enable slow query log

# Add indexes for frequently queried fields
ALTER TABLE `tabCustomer` ADD INDEX `idx_email` (`email`);

# Optimize tables
OPTIMIZE TABLE `tabCustomer`;
```

### Redis Configuration

```bash
# Configure Redis for production
# In /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Gunicorn Workers

```bash
# Set workers based on CPU cores
# Formula: (2 x $num_cores) + 1

# In site_config.json
{
    "gunicorn_workers": 9  # For 4 CPU cores
}

# Restart after change
sudo supervisorctl restart all
```

## Security Hardening

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Block direct database access from outside
sudo ufw deny 3306/tcp  # MariaDB
```

### SSL/TLS Configuration

```bash
# Use Let's Encrypt
sudo bench setup lets-encrypt site1.local

# Renew SSL certificates
sudo bench renew-lets-encrypt

# Force HTTPS
# In nginx config, redirect HTTP to HTTPS
```

### Regular Security Updates

```bash
# Update OS packages
sudo apt update && sudo apt upgrade

# Update Frappe framework
bench update --requirements

# Update custom apps
cd apps/custom_app
git pull
cd ../..
bench restart
```

## Disaster Recovery

### Recovery Procedure

```bash
# 1. Setup new server/bench
bench init frappe-bench
cd frappe-bench

# 2. Get apps
bench get-app custom_app

# 3. Create site
bench new-site site1.local

# 4. Install apps
bench --site site1.local install-app custom_app

# 5. Restore from backup
bench --site site1.local restore /path/to/backup.sql.gz
bench --site site1.local restore --with-files /path/to/files.tar

# 6. Migrate if needed
bench --site site1.local migrate

# 7. Setup production
sudo bench setup production frappe-user
```

## Scaling Considerations

### Vertical Scaling

- Increase server RAM (8GB minimum, 16GB+ recommended)
- Add more CPU cores
- Use SSD for database
- Increase database connection pool

### Horizontal Scaling

```bash
# Setup separate servers for:
# 1. Web/Application server
# 2. Database server (MariaDB)
# 3. Queue server (Redis + RQ workers)

# Configure site_config.json
{
    "db_host": "db-server.example.com",
    "db_port": 3306,
    "redis_cache": "redis://cache-server:6379",
    "redis_queue": "redis://queue-server:6379"
}
```

### Load Balancing

```nginx
# nginx load balancer config
upstream frappe_servers {
    server 192.168.1.10:8000;
    server 192.168.1.11:8000;
    server 192.168.1.12:8000;
}

server {
    location / {
        proxy_pass http://frappe_servers;
    }
}
```

## Deployment Checklist

### Before Going Live

- [ ] All tests passing
- [ ] Code review completed
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Backup strategy tested
- [ ] Monitoring configured
- [ ] SSL certificates valid
- [ ] DNS configured correctly
- [ ] Firewall rules applied
- [ ] Documentation updated

### After Deployment

- [ ] Verify site is accessible
- [ ] Test critical user workflows
- [ ] Check error logs
- [ ] Verify scheduled jobs running
- [ ] Test backup/restore
- [ ] Monitor performance metrics
- [ ] Update status page

## Troubleshooting

### Common Issues

```bash
# Site not accessible
sudo supervisorctl status
sudo systemctl status nginx
bench doctor

# Database connection errors
bench --site site1.local mariadb
# Check credentials in site_config.json

# Slow performance
# Check worker processes
sudo supervisorctl status
# Check database slow queries
# Check Redis memory usage

# Email not sending
# Verify SMTP settings in site_config.json
# Test email: bench --site site1.local send-test-email user@example.com
```

## MANDATORY Requirements

**NEVER deploy without:**
- ✅ Backups configured and tested
- ✅ HTTPS/SSL enabled
- ✅ `developer_mode = 0`
- ✅ Strong passwords
- ✅ Monitoring setup
- ✅ Error logging enabled
- ✅ Tests passing
- ✅ Security review completed

**NEVER in production:**
- ❌ `developer_mode = 1`
- ❌ Test accounts or data
- ❌ Hardcoded secrets
- ❌ Disabled security features
- ❌ No backups
- ❌ Direct database access from outside
- ❌ Weak passwords
