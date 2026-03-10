---
name: frappe-bench-usage
description: Bench CLI commands and workflows - site management, app operations, database tasks, development tools, and troubleshooting.
origin: ECC
---

# Frappe Bench Commands

Complete guide to using bench CLI for Frappe development and operations.

## When to Activate

- Managing Frappe sites and apps
- Running database migrations
- Building assets
- Development workflows
- Troubleshooting issues
- Deployment operations

## Bench Structure

```
frappe-bench/
├── apps/         # Frappe apps
├── sites/        # Multi-tenant sites
├── config/       # Server configs
├── logs/         # Application logs
└── env/          # Python virtual environment
```

## Site Management

### Create New Site

```bash
# Create site with MySQL
bench new-site site1.local

# Create with PostgreSQL
bench new-site site1.local --db-type postgres

# With admin password
bench new-site site1.local --admin-password secretpassword

# With specific database name
bench new-site site1.local --db-name custom_db_name
```

### Set Active Site

```bash
# Set default site for commands
bench use site1.local

# Or specify site in commands
bench --site site1.local migrate
```

### List Sites

```bash
bench --site all list
```

### Drop Site

```bash
#Delete site and database
bench drop-site site1.local --force
```

### Backup/Restore

```bash
# Backup site
bench --site site1.local backup
bench --site site1.local backup --with-files

# Restore from backup
bench --site site1.local restore /path/to/backup.sql.gz
bench --site site1.local restore --with-files /path/to/files.tar
```

## App Management

### Get App from GitHub

```bash
# Get app from official Frappe repository
bench get-app erpnext

# Get from custom repository
bench get-app https://github.com/user/custom_app

# Get specific branch
bench get-app https://github.com/user/custom_app --branch develop
```

### Install App on Site

```bash
# Install app on current site
bench --site site1.local install-app custom_app

# Install on all sites
bench --site all install-app custom_app
```

### Remove App

```bash
# Uninstall from site
bench --site site1.local uninstall-app custom_app

# Remove app entirely
bench remove-app custom_app
```

### Update Apps

```bash
# Update single app
bench update --app frappe

# Update all apps
bench update

# Update without backup
bench update --no-backup

# Pull changes only (no migrate)
bench update --pull

# Update only requirements
bench update --requirements
```

## Development Commands

### Start Development Server

```bash
# Start server
bench start

# Start in development mode
bench --site site1.local serve --port 8000

# Watch and rebuild assets
bench watch
```

### Console

```bash
# IPython console with Frappe context
bench --site site1.local console

# Example commands in console:
>>> frappe.db.get_value("Customer", "CUST-001", "customer_name")
>>> frappe.get_all("Sales Order", limit=5)
>>> frappe.get_doc("Customer", "CUST-001")
```

### Database Operations

```bash
# Migrate database (apply pending patches)
bench --site site1.local migrate

# Reset site (drop all data)
bench --site site1.local reinstall

# Import fixtures
bench --site site1.local import-csv /path/to/file.csv --doctype "Customer"

# MySQL console
bench --site site1.local mariadb

# PostgreSQL console
bench --site site1.local postgres
```

### Clear Cache

```bash
# Clear all caches
bench --site site1.local clear-cache

# Clear website cache
bench --site site1.local clear-website-cache

# Rebuild search index
bench --site site1.local build-search-index
```

### Build Assets

```bash
# Build JS/CSS assets
bench build

# Force rebuild
bench build --force

# Build for production
bench build --production

# Watch and rebuild on changes
bench watch
```

## DocType Operations

### Create New DocType

```bash
# Create DocType via console
bench --site site1.local console

>>> doc = frappe.get_doc({
...     "doctype": "DocType",
...     "name": "My Custom DocType",
...     "module": "Custom App",
...     "fields": [
...         {"fieldname": "title", "fieldtype": "Data", "label": "Title"}
...     ]
... })
>>> doc.insert()
```

### Export Fixtures

```bash
# Export specific DocType
bench --site site1.local export-fixtures --app custom_app

# This exports DocTypes listed in hooks.py fixtures
```

### Import Fixtures

```bash
# Import all fixtures for app
bench --site site1.local import-fixtures --app custom_app
```

## Testing

```bash
# Run all tests
bench --site site1.local run-tests

# Run tests for specific app
bench --site site1.local run-tests --app custom_app

# Run tests for DocType
bench --site site1.local run-tests --doctype "Customer"

# Run with coverage
bench --site site1.local run-tests --app custom_app --coverage

# Run UI tests
bench --site site1.local run-ui-tests custom_app

# Run in parallel
bench --site site1.local run-tests --app custom_app --parallel
```

## Production Operations

### Restart Services

```bash
# Restart web and worker processes
bench restart

# Restart web only
bench restart web

# Restart workers only
bench restart worker
```

### Setup Production

```bash
# Setup production environment (nginx, supervisor)
sudo bench setup production frappe-user

# Enable/disable production mode
bench --site site1.local enable-scheduler
bench --site site1.local disable-scheduler
```

### SSL/HTTPS

```bash
# Setup Let's Encrypt SSL
sudo bench setup lets-encrypt site1.local

# Renew SSL certificates
sudo bench renew-lets-encrypt
```

## Scheduler

```bash
# Enable scheduler
bench --site site1.local enable-scheduler

# Disable scheduler
bench --site site1.local disable-scheduler

# Run scheduler events manually
bench --site site1.local run-scheduled-jobs

# Trigger specific event
bench --site site1.local trigger-scheduler-event daily
```

## Logs and Debugging

```bash
# View logs
tail -f sites/site1.local/logs/web.log
tail -f sites/site1.local/logs/worker.log
tail -f sites/site1.local/logs/error.log

# Enable/disable developer mode
bench --site site1.local set-config developer_mode 1
bench --site site1.local set-config developer_mode 0

# Set log level
bench --site site1.local set-config logging "DEBUG"
```

## Configuration

```bash
# Set config value
bench --site site1.local set-config key value

# Get config value
bench --site site1.local get-config key

# Common configs:
bench --site site1.local set-config developer_mode 1
bench --site site1.local set-config mail_server "smtp.gmail.com"
bench --site site1.local set-config mail_port 587
```

## Bench Config

```bash
# Setup config for production
bench config dns_multitenant on
bench config serve_default_site on

# Setup redis
bench config redis_cache "redis://localhost:6379"
bench config redis_queue "redis://localhost:6379"
```

## Troubleshooting

### Common Issues

```bash
# Permission errors
bench fix-permissions

# Build errors
bench build --force
bench clear-cache

# Database connection issues
bench restart
bench --site site1.local migrate

# Import errors
bench restart
bench --site site1.local console
>>> import myapp  # Test import

# Port already in use
bench start --port 8001
```

### Health Check

```bash
# Check bench setup
bench doctor

# Check site health
bench --site site1.local doctor
```

## Utility Commands

```bash
# Bench version
bench version

# Python version
bench python --version

# List apps and versions
bench --version

# Show site config
bench --site site1.local show-config

# Switch branch for app
cd apps/custom_app
git checkout develop
cd ../..
bench restart
```

## Best Practices

**DO:**
- ✅ Always backup before migrations
- ✅ Use `--site` flag explicitly in scripts
- ✅ Run `bench migrate` after pulling updates
- ✅ Clear cache after configuration changes
- ✅ Use version control for custom apps
- ✅ Test in development before production

**DON'T:**
- ❌ Run production commands in development
- ❌ Skip backups before major operations
- ❌ Modify core Frappe/ERPNext code
- ❌ Run bench as root user
- ❌ Ignore migration errors
- ❌ Delete sites without backups
