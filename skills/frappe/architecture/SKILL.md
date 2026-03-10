---
name: frappe-architecture
description: Frappe framework architecture - bench structure, apps, sites, modules, hooks, and MVC patterns for building multi-tenant applications.
origin: ECC
---

# Frappe Framework Architecture

Comprehensive guide to Frappe's architecture, from bench structure to application design patterns.

## When to Activate

- Planning Frappe application structure
- Creating new Frappe apps
- Understanding Frappe's multi-tenancy model
- Designing modules and DocTypes
- Configuring app hooks
- Troubleshooting architecture issues

## Core Concepts

### 1. Bench - The Development Environment

Bench is Frappe's CLI tool for managing apps and sites.

```bash
frappe-bench/
├── apps/              # All Frappe apps
│   ├── frappe/       # Core framework
│   ├── erpnext/      # ERP application (optional)
│   └── custom_app/   # Your custom app
├── sites/            # All sites (multi-tenant)
│   ├── site1.local/
│   └── site2.local/
├── config/           # Nginx, supervisor configs
├── logs/             # Application logs
└── env/              # Python virtual environment
```

**Key Points:**
- One bench can host multiple apps
- One bench can serve multiple sites
- Each site is a separate database instance
- Apps are shared across all sites

### 2. Frappe App Structure

A Frappe app follows a specific directory structure:

```python
custom_app/
├── custom_app/              # Main package (same name as app)
│   ├── __init__.py
│   ├── hooks.py            # App configuration and hooks
│   ├── modules.txt         # List of modules
│   ├── config/             # App-level configuration
│   │   ├── desktop.py     # Desktop icons
│   │   └── docs.py        # Documentation config
│   ├── public/             # Static files (JS, CSS, images)
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   ├── templates/          # Jinja2 templates
│   │   ├── pages/         # Web pages
│   │   └── includes/      # Reusable templates
│   ├── www/                # Web views (auto-routed)
│   ├── crm/                # Module: CRM
│   │   ├── __init__.py
│   │   ├── doctype/       # DocTypes in this module
│   │   │   ├── customer/
│   │   │   │   ├── customer.json      # DocType definition
│   │   │   │   ├── customer.py        # Controller
│   │   │   │   ├── customer.js        # Client script
│   │   │   │   └── test_customer.py   # Tests
│   │   │   └── lead/
│   │   ├── report/        # Reports
│   │   ├── page/          # Custom pages
│   │   └── dashboard/     # Dashboards
│   └── accounting/         # Module: Accounting
│       └── doctype/
│           ├── invoice/
│           └── payment/
├── requirements.txt        # Python dependencies
├── setup.py               # Package configuration
├── README.md
└── license.txt
```

### 3. hooks.py - App Configuration

The `hooks.py` file is the central configuration for a Frappe app.

```python
# custom_app/custom_app/hooks.py

app_name = "custom_app"
app_title = "Custom App"
app_publisher = "Your Company"
app_description = "Custom business application"
app_email = "contact@yourcompany.com"
app_license = "MIT"

# Apps Dependencies
required_apps = ["frappe"]

# Document Events Hooks
doc_events = {
    "Customer": {
        "validate": "custom_app.crm.customer.validate_customer",
        "on_update": "custom_app.crm.customer.on_customer_update",
        "on_trash": "custom_app.crm.customer.prevent_customer_delete"
    },
    "*": {
        "on_update": "custom_app.utils.log_all_changes"
    }
}

# Scheduled Tasks (cron jobs)
scheduler_events = {
    "daily": [
        "custom_app.tasks.send_daily_report"
    ],
    "hourly": [
        "custom_app.tasks.sync_external_data"
    ],
    "cron": {
        "0 9 * * *": [  # Every day at 9 AM
            "custom_app.tasks.morning_sync"
        ]
    }
}

# Override standard queries
override_doctype_class = {
    "User": "custom_app.overrides.user.CustomUser"
}

# Boot session
boot_session = "custom_app.boot.boot_session"

# Jinja template filters
jinja = {
    "methods": [
        "custom_app.utils.format_currency"
    ],
    "filters": [
        "custom_app.utils.custom_filter"
    ]
}

# Website settings
website_route_rules = [
    {"from_route": "/custom/<path>", "to_route": "custom_page"},
]

# Add all simple route rules here
website_route_rules = [
    {"from_route": "/api/<path:path>", "to_route": "api"},
]

# Whitelisted methods (callable via REST API)
# Moved to individual files with @frappe.whitelist() decorator

# Fixtures - Master data to export/import
fixtures = [
    "Custom Field",
    "Property Setter",
    {"dt": "Role", "filters": [["name", "in", ["CRM Manager", "CRM User"]]]},
]
```

### 4. Module Organization

Modules group related DocTypes and functionality.

```python
# custom_app/custom_app/modules.txt
CRM
Accounting
Inventory
Reports
```

**Best Practices:**
- Keep modules focused (single responsibility)
- Use clear, descriptive names (Title Case With Spaces)
- Group related DocTypes together
- Don't create too many small modules (3-8 is typical)

### 5. MVC Pattern in Frappe

Frappe follows a modified MVC pattern:

```
DocType (Model)
    ↓
Controller.py (Business Logic)
    ↓
Form.js (View/UI Logic)
```

**Example: Customer DocType**

```python
# customer.py - Controller (Business Logic)
import frappe
from frappe.model.document import Document
from frappe import _

class Customer(Document):
    """Customer DocType controller"""

    def validate(self):
        """Validation before save"""
        self.validate_email()
        self.set_customer_name()

    def validate_email(self):
        """Ensure email is unique"""
        if self.email:
            existing = frappe.db.exists("Customer", {
                "email": self.email,
                "name": ["!=", self.name]
            })
            if existing:
                frappe.throw(_("Email {0} already exists").format(self.email))

    def set_customer_name(self):
        """Auto-set customer name if not provided"""
        if not self.customer_name:
            self.customer_name = self.first_name + " " + self.last_name

    def on_update(self):
        """After save hook"""
        self.sync_to_external_system()

    def on_trash(self):
        """Before delete hook"""
        if self.has_transactions():
            frappe.throw(_("Cannot delete Customer with transactions"))

    def has_transactions(self):
        """Check if customer has related transactions"""
        return frappe.db.exists("Sales Order", {"customer": self.name})
```

```javascript
// customer.js - Client Script (UI Logic)
frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        // Add custom button
        if (!frm.is_new()) {
            frm.add_custom_button(__('View Orders'), () => {
                frappe.set_route('List', 'Sales Order', {
                    'customer': frm.doc.name
                });
            });
        }

        // Show indicator based on status
        frm.set_indicator_formatter('status',
            function(doc) {
                return (doc.status === 'Active') ? 'green' : 'red';
            }
        );
    },

    email: function(frm) {
        // Validate email format on change
        if (frm.doc.email && !frappe.utils.validate_email(frm.doc.email)) {
            frappe.msgprint(__('Invalid email format'));
            frm.set_value('email', '');
        }
    },

    before_save: function(frm) {
        // Client-side validation before save
        if (!frm.doc.first_name) {
            frappe.throw(__('First Name is mandatory'));
        }
    }
});
```

### 6. Multi-Tenancy Model

Frappe's multi-tenancy allows multiple sites on one bench:

```
frappe-bench/
├── apps/
│   └── custom_app/         # Shared app code
├── sites/
    ├── site1.local/
    │   ├── site_config.json
    │   ├── private/
    │   └── public/
    ├── site2.local/
    │   ├── site_config.json
    │   ├── private/
    │   └── public/
    └── common_site_config.json
```

**Key Points:**
- Each site has its own database
- Each site can enable different apps
- Sites share app code but have isolated data
- Configuration is per-site (site_config.json)

```json
// site1.local/site_config.json
{
    "db_name": "site1_local",
    "db_password": "password",
    "db_type": "mariadb",
    "developer_mode": 1,
    "installed_apps": [
        "frappe",
        "erpnext",
        "custom_app"
    ]
}
```

### 7. Request Lifecycle

Understanding how Frappe processes requests:

```
1. User Request (HTTP)
    ↓
2. Frappe Router (finds endpoint)
    ↓
3. Permission Check (frappe.has_permission)
    ↓
4. Method Execution (@frappe.whitelist())
    ↓
5. Business Logic (Controller methods)
    ↓
6. Database Operations (frappe.db)
    ↓
7. Response (JSON/HTML)
```

**Example Flow:**

```python
# 1. User calls: GET /api/method/custom_app.api.get_customer

# 2. Frappe routes to:
@frappe.whitelist()
def get_customer(customer_id):
    # 3. Permission check
    if not frappe.has_permission("Customer", "read"):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    # 4. Get data
    customer = frappe.get_doc("Customer", customer_id)

    # 5. Return response
    return customer.as_dict()
```

### 8. Database Layer

Frappe provides an abstraction over MariaDB/PostgreSQL:

```python
# Query builder (safe from SQL injection)
customers = frappe.get_all("Customer",
    filters={"status": "Active"},
    fields=["name", "customer_name", "email"],
    order_by="creation desc",
    limit=10
)

# Get single value
email = frappe.db.get_value("Customer", "CUST-00001", "email")

# Get single document
customer = frappe.get_doc("Customer", "CUST-00001")

# Create new document
new_customer = frappe.get_doc({
    "doctype": "Customer",
    "customer_name": "John Doe",
    "email": "john@example.com"
})
new_customer.insert()

# Update document
customer.status = "Inactive"
customer.save()

# Delete document
customer.delete()

# Raw SQL (use with caution)
results = frappe.db.sql("""
    SELECT name, customer_name
    FROM `tabCustomer`
    WHERE status = %(status)s
""", {"status": "Active"}, as_dict=True)
```

### 9. Permission System

Frappe has a sophisticated role-based permission system:

```
User → Role → Permission Level → DocType
```

**Example Permission Setup:**

```python
# In hooks.py
permissions = {
    "Customer": {
        "CRM User": {
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 0
        },
        "CRM Manager": {
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1
        }
    }
}
```

**Permission Checks in Code:**

```python
# Check if user has permission
if frappe.has_permission("Customer", "delete"):
    customer.delete()

# Get permitted documents only
customers = frappe.get_list("Customer",
    filters={"status": "Active"},
    ignore_permissions=False  # Respects user permissions
)

# Set user context for testing
frappe.set_user("test@example.com")
```

## Architectural Patterns

### 1. App Dependencies

```python
# hooks.py
required_apps = ["frappe", "erpnext"]  # Install order matters
```

### 2. App Extension

Extend existing apps without modifying their code:

```python
# Extend ERPNext Customer
# In hooks.py
doc_events = {
    "Customer": {
        "validate": "custom_app.custom_customer.validate",
    }
}

# In custom_customer.py
def validate(doc, method):
    """Custom validation for ERPNext Customer"""
    # Your custom logic
    pass
```

### 3. Background Jobs

```python
# Enqueue long-running tasks
frappe.enqueue(
    "custom_app.tasks.process_large_file",
    file_path="/tmp/data.csv",
    timeout=300,
    queue="long"  # Queues: default, short, long
)

# In tasks.py
def process_large_file(file_path):
    """Process file in background"""
    # Long-running operation
    pass
```

### 4. Caching

```python
# Cache expensive operations
@frappe.whitelist()
def get_dashboard_data():
    # Cache for 5 minutes
    cache_key = "dashboard_data"
    data = frappe.cache().get_value(cache_key)

    if not data:
        data = expensive_calculation()
        frappe.cache().set_value(cache_key, data, expires_in_sec=300)

    return data
```

## Best Practices

**DO:**
- ✅ Follow the standard directory structure
- ✅ Use modules to organize related DocTypes
- ✅ Configure all hooks in hooks.py
- ✅ Use frappe.db methods (SQL injection safe)
- ✅ Check permissions explicitly in whitelisted methods
- ✅ Use background jobs for long operations
- ✅ Write tests for all controllers

**DON'T:**
- ❌ Modify core Frappe or ERPNext code
- ❌ Hardcode site-specific data in app code
- ❌ Use raw SQL without parameterization
- ❌ Skip permission checks in custom APIs
- ❌ Store sensitive data in hooks.py
- ❌ Create circular app dependencies

## Common Pitfalls

### 1. Direct Database Modification

```python
# Bad: Bypasses business logic
frappe.db.set_value("Customer", "CUST-001", "status", "Inactive")

# Good: Triggers validate(), on_update() hooks
customer = frappe.get_doc("Customer", "CUST-001")
customer.status = "Inactive"
customer.save()
```

### 2. Ignoring Multi-Tenancy

```python
# Bad: Assumes single site
base_url = "https://mysite.com"

# Good: Uses current site
base_url = frappe.utils.get_url()
```

### 3. Synchronous Long Operations

```python
# Bad: Blocks request
def process_1000_records():
    for record in records:
        process(record)  # Takes 5 minutes

# Good: Background job
frappe.enqueue("app.tasks.process_1000_records")
```

## Debugging Tips

```python
# Enable developer mode (site_config.json)
{
    "developer_mode": 1
}

# Print debug info
frappe.log_error(message="Debug info", title="Debug")

# SQL query logging
frappe.db.debug = 1

# Profile performance
import cProfile
cProfile.runctx('my_function()', globals(), locals())
```

## Next Steps

After understanding architecture:
1. Learn DocType patterns → `frappe-doctype-patterns`
2. Understand API development → `frappe-api-patterns`
3. Master testing → `frappe-testing`
4. Learn bench commands → `frappe-bench-usage`
5. Implement permissions → `frappe-permissions`
