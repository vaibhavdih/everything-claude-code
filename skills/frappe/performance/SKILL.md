---
name: frappe-performance
description: Frappe performance optimization - caching strategies, database indexing, query optimization, and scaling patterns.
origin: ECC
---

# Frappe Performance Optimization

Guide to optimizing Frappe application performance, caching, and scaling.

## When to Activate

- Optimizing slow queries
- Implementing caching
- Scaling applications
- Reducing page load times
- Improving database performance
- Handling high traffic

## Performance Profiling

### Enable Developer Mode

```json
// site_config.json
{
    "developer_mode": 1,
    "developer_mode_timings": 1
}
```

### Query Profiling

```python
# Enable SQL logging
frappe.db.debug = 1

# Your code
customers = frappe.get_all("Customer", limit=1000)

# Disable logging
frappe.db.debug = 0

# View queries in console
```

### Python Profiling

```python
import cProfile
import pstats

def profile_function():
    """Profile a specific function"""

    profiler = cProfile.Profile()
    profiler.enable()

    # Your code here
    result = expensive_operation()

    profiler.disable()

    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(10)  # Top 10

    return result
```

## Caching Strategies

### Cache Types in Frappe

1. **Redis Cache** - In-memory caching
2. **File Cache** - Disk-based caching
3. **Browser Cache** - Client-side caching

### Redis Cache

```python
# Set cache value
frappe.cache().set_value("dashboard_stats", stats_data, expires_in_sec=300)  # 5 min

# Get cache value
data = frappe.cache().get_value("dashboard_stats")

if not data:
    data = expensive_calculation()
    frappe.cache().set_value("dashboard_stats", data, expires_in_sec=300)

# Delete cache
frappe.cache().delete_value("dashboard_stats")

# Clear all cache
frappe.cache().delete_keys("dashboard_*")
```

### Function-Level Caching

```python
from frappe.utils import cint

def get_customer_stats(customer):
    """Get customer statistics with caching"""

    cache_key = f"customer_stats:{customer}"

    # Try cache first
    stats = frappe.cache().get_value(cache_key)

    if not stats:
        # Calculate stats
        stats = {
            "total_orders": frappe.db.count("Sales Order", {"customer": customer}),
            "total_revenue": frappe.db.get_value("Customer", customer, "total_revenue"),
            "avg_order": calculate_avg_order(customer)
        }

        # Cache for 10 minutes
        frappe.cache().set_value(cache_key, stats, expires_in_sec=600)

    return stats
```

### Decorator-Based Caching

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_territory_tree(territory):
    """Get territory hierarchy with LRU cache"""

    children = frappe.get_all("Territory",
        filters={"parent_territory": territory},
        fields=["name", "is_group"]
    )

    return children
```

### Invalidate Cache on Update

```python
# In customer.py
class Customer(Document):

    def on_update(self):
        """Clear cache when customer is updated"""

        # Clear customer-specific cache
        frappe.cache().delete_value(f"customer_stats:{self.name}")

        # Clear related caches
        frappe.cache().delete_keys(f"territory_stats:{self.territory}:*")
```

## Database Optimization

### Add Indexes

```sql
-- Add index on frequently queried fields
ALTER TABLE `tabCustomer` ADD INDEX `idx_email` (`email`);
ALTER TABLE `tabSales Order` ADD INDEX `idx_customer_date` (`customer`, `transaction_date`);
ALTER TABLE `tabSales Order` ADD INDEX `idx_status` (`status`);

-- Composite index for common filters
ALTER TABLE `tabSales Order` ADD INDEX `idx_customer_status_date` (`customer`, `status`, `transaction_date`);
```

```python
# Add index via code
frappe.db.sql("""
    ALTER TABLE `tabCustomer`
    ADD INDEX IF NOT EXISTS idx_territory (territory)
""")
```

### Optimize Queries

```python
# ❌ BAD: SELECT *
customers = frappe.db.sql("SELECT * FROM `tabCustomer`")

# ✅ GOOD: Select only needed fields
customers = frappe.db.sql("""
    SELECT name, customer_name, email
    FROM `tabCustomer`
    WHERE status = 'Active'
""")

# ❌ BAD: N+1 query problem
for customer in customers:
    orders = frappe.get_all("Sales Order", {"customer": customer.name})  # Query in loop!

# ✅ GOOD: Single query with JOIN
data = frappe.db.sql("""
    SELECT
        c.name as customer,
        c.customer_name,
        COUNT(so.name) as order_count
    FROM `tabCustomer` c
    LEFT JOIN `tabSales Order` so ON so.customer = c.name
    GROUP BY c.name
""", as_dict=True)
```

### Pagination

```python
# ✅ GOOD: Use pagination for large datasets
def get_customers_paginated(page=1, page_size=20):
    """Get customers with pagination"""

    start = (page - 1) * page_size

    customers = frappe.get_all("Customer",
        fields=["name", "customer_name", "email"],
        start=start,
        page_length=page_size,
        order_by="creation desc"
    )

    total = frappe.db.count("Customer")

    return {
        "data": customers,
        "page": page,
        "page_size": page_size,
        "total": total,
        "pages": (total + page_size - 1) // page_size
    }
```

### Query Optimization

```python
# Use exists() instead of get_all() for existence checks
if frappe.db.exists("Customer", {"email": email}):
    # More efficient than:
    # if frappe.get_all("Customer", {"email": email}):
    pass

# Use count() instead of len(get_all())
count = frappe.db.count("Customer", {"status": "Active"})
# More efficient than:
# count = len(frappe.get_all("Customer", {"status": "Active"}))

# Use get_value() for single values
email = frappe.db.get_value("Customer", customer_id, "email")
# More efficient than:
# customer = frappe.get_doc("Customer", customer_id)
# email = customer.email
```

## Background Jobs

### Offload Heavy Operations

```python
# ❌ BAD: Heavy operation in request
@frappe.whitelist()
def process_large_file(file_path):
    # Processes for 5 minutes - blocks request!
    for row in read_large_file(file_path):
        process_row(row)

# ✅ GOOD: Use background job
@frappe.whitelist()
def process_large_file(file_path):
    """Enqueue background job"""

    frappe.enqueue(
        "myapp.tasks.process_file_async",
        file_path=file_path,
        queue="long",
        timeout=600
    )

    return {"status": "processing", "message": "File processing started"}

# In tasks.py
def process_file_async(file_path):
    """Process file in background"""
    for row in read_large_file(file_path):
        process_row(row)
```

### Queue Management

```python
# Different queues for different priorities
frappe.enqueue(method, queue="short", timeout=300)    # < 5 min
frappe.enqueue(method, queue="default", timeout=600)  # < 10 min
frappe.enqueue(method, queue="long", timeout=1800)    # < 30 min
```

## Asset Optimization

### Minify JS/CSS

```bash
# Build assets for production
bench build --production

# This minifies and bundles assets
```

### Bundle Size Optimization

```javascript
// Use dynamic imports for large modules
frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        // Load heavy module only when needed
        import('./heavy_module.js').then(module => {
            module.init(frm);
        });
    }
});
```

### CDN for Static Assets

```json
// site_config.json
{
    "cdn_link": "https://cdn.example.com"
}
```

## DocType Optimization

### Avoid Heavy Computations in validate()

```python
# ❌ BAD: Heavy computation on every save
class Customer(Document):
    def validate(self):
        self.calculate_lifetime_value()  # Queries all orders!

# ✅ GOOD: Compute asynchronously
class Customer(Document):
    def validate(self):
        # Light validation only
        pass

    def after_insert(self):
        # Enqueue heavy computation
        frappe.enqueue("myapp.tasks.calculate_customer_ltv",
            customer=self.name,
            queue="default"
        )
```

### Reduce Child Table Operations

```python
# ❌ BAD: Loading full documents in loop
for item in order.items:
    item_doc = frappe.get_doc("Item", item.item_code)  # Heavy!
    price = item_doc.standard_rate

# ✅ GOOD: Batch fetch with get_all
item_codes = [item.item_code for item in order.items]
items = frappe.get_all("Item",
    filters={"name": ["in", item_codes]},
    fields=["name", "standard_rate"]
)
item_prices = {item.name: item.standard_rate for item in items}

for item in order.items:
    price = item_prices.get(item.item_code)
```

## API Performance

### Response Compression

```python
# Enable GZIP compression in nginx
# Already enabled in production setup
```

### Paginate API Responses

```python
@frappe.whitelist()
def get_customers(page=1, page_size=20):
    """API with pagination"""

    start = (int(page) - 1) * int(page_size)

    customers = frappe.get_all("Customer",
        fields=["name", "customer_name"],
        start=start,
        page_length=page_size
    )

    return {
        "data": customers,
        "page": int(page),
        "page_size": int(page_size)
    }
```

### Use Field Filters

```python
# ❌ BAD: Return all fields
@frappe.whitelist()
def get_customer(customer):
    return frappe.get_doc("Customer", customer).as_dict()  # All fields!

# ✅ GOOD: Return only needed fields
@frappe.whitelist()
def get_customer(customer):
    return frappe.db.get_value("Customer", customer,
        ["name", "customer_name", "email", "status"],
        as_dict=True
    )
```

## Scaling Strategies

### Vertical Scaling

- Increase server RAM (16GB+ recommended)
- Add CPU cores
- Use SSD for database
- Increase MariaDB buffer pool

### Horizontal Scaling

```bash
# Separate servers for:
# 1. Application (Gunicorn workers)
# 2. Database (MariaDB)
# 3. Queue (Redis + RQ workers)
# 4. Web Server (Nginx)
```

### Configure for Scale

```json
// site_config.json
{
    "gunicorn_workers": 8,  // 2 x CPU cores + 1
    "background_workers": 4,
    "scheduler_enabled": 1,

    // Separate Redis instances
    "redis_cache": "redis://cache-server:6379/0",
    "redis_queue": "redis://queue-server:6379/0",
    "redis_socketio": "redis://socketio-server:6379/0"
}
```

## Monitoring

### Key Metrics

```python
# Monitor these metrics
- Request latency (< 200ms target)
- Database query time (< 100ms per query)
- Cache hit rate (> 80% target)
- Background job queue size
- Memory usage
- CPU usage
```

### New Relic Integration

```bash
# Install New Relic
pip install newrelic

# Configure
export NEW_RELIC_CONFIG_FILE=/path/to/newrelic.ini
```

### Custom Metrics

```python
def track_operation_time():
    """Track operation time"""

    import time
    start = time.time()

    # Operation
    result = expensive_operation()

    duration = time.time() - start

    # Log metric
    frappe.log_error(
        f"Operation took {duration:.2f}s",
        "Performance Metric"
    )

    return result
```

## Best Practices

**DO:**
- ✅ Cache expensive operations
- ✅ Use database indexes
- ✅ Paginate large result sets
- ✅ Use background jobs for heavy tasks
- ✅ Monitor query performance
- ✅ Minimize DocType loads
- ✅ Use batch operations
- ✅ Profile before optimizing

**DON'T:**
- ❌ Load full documents when only fields needed
- ❌ Use SELECT * in production
- ❌ Run heavy operations synchronously
- ❌ Skip caching frequently accessed data
- ❌ Ignore N+1 query problems
- ❌ Forget to add indexes
- ❌ Cache without expiration
- ❌ Optimize prematurely

## Performance Checklist

- [ ] Database indexes on frequently queried fields
- [ ] Caching for expensive operations
- [ ] Background jobs for heavy processing
- [ ] Pagination for large lists
- [ ] Query optimization (avoid SELECT *)
- [ ] Asset minification (production build)
- [ ] Redis configured and working
- [ ] Gunicorn workers set appropriately
- [ ] Monitoring enabled
- [ ] Regular performance audits
