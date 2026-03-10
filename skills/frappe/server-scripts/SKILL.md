---
name: frappe-server-scripts
description: Frappe server-side Python patterns for controllers, document events, whitelisted APIs, background jobs, and database operations. Use when writing controller logic, creating APIs, handling document events, or processing data on the server.
---

# Frappe Server Scripts

Server-side Python development patterns for Frappe Framework.

## When to Use

- Writing document controllers (`my_doctype.py`)
- Creating whitelisted API endpoints
- Handling document lifecycle events
- Background job processing
- Database operations and queries
- Permission checks and validation

## Document Controller Structure

```python
# my_doctype.py
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import nowdate, flt, cint, getdate


class MyDocType(Document):
    def validate(self):
        """Main validation - called on insert and update"""
        self.validate_dates()
        self.validate_amounts()
        self.calculate_totals()

    def before_insert(self):
        """Called before new document is inserted"""
        if not self.posting_date:
            self.posting_date = nowdate()

    def after_insert(self):
        """Called after new document is inserted"""
        self.send_notification()

    def on_update(self):
        """Called after document is saved (insert or update)"""
        self.update_related_documents()

    def on_submit(self):
        """Called after document is submitted"""
        self.create_gl_entries()

    def on_cancel(self):
        """Called after document is cancelled"""
        self.reverse_gl_entries()

    def validate_dates(self):
        """Custom validation method"""
        if self.end_date and getdate(self.start_date) > getdate(self.end_date):
            frappe.throw(_("End Date cannot be before Start Date"))

    def calculate_totals(self):
        """Calculate document totals"""
        self.total = 0
        for item in self.items:
            item.amount = flt(item.qty) * flt(item.rate)
            self.total += item.amount
```

## Whitelisted APIs

```python
@frappe.whitelist()
def get_customer_details(customer):
    """Get customer details

    Args:
        customer (str): Customer ID

    Returns:
        dict: Customer details
    """
    if not customer:
        frappe.throw(_("Customer is required"))

    # Permission check
    if not frappe.has_permission("Customer", "read"):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    doc = frappe.get_doc("Customer", customer)

    return {
        "customer_name": doc.customer_name,
        "customer_type": doc.customer_type,
        "territory": doc.territory
    }


@frappe.whitelist(allow_guest=True)
def public_api():
    """Public API - no login required"""
    return {"status": "ok"}


@frappe.whitelist(methods=["POST"])
def create_record(data):
    """Only accepts POST requests"""
    data = frappe.parse_json(data)
    doc = frappe.get_doc(data)
    doc.insert()
    return {"name": doc.name}
```

## Database Operations

### Reading Data

```python
# Get single document
doc = frappe.get_doc("Customer", "CUST-001")

# Get single value
name = frappe.db.get_value("Customer", "CUST-001", "customer_name")

# Get multiple values
values = frappe.db.get_value("Customer", "CUST-001",
    ["customer_name", "territory"], as_dict=True)

# Get list
customers = frappe.db.get_all("Customer",
    filters={"status": "Active"},
    fields=["name", "customer_name", "territory"],
    order_by="customer_name asc",
    limit=10
)

# Complex filters
invoices = frappe.db.get_all("Sales Invoice",
    filters={
        "status": ["in", ["Paid", "Unpaid"]],
        "grand_total": [">", 1000],
        "posting_date": [">=", "2024-01-01"]
    }
)

# Count
count = frappe.db.count("Customer", {"status": "Active"})

# Exists check
exists = frappe.db.exists("Customer", "CUST-001")
```

### Raw SQL (Use with Caution)

```python
# Parameterized query (SAFE)
result = frappe.db.sql("""
    SELECT name, customer_name
    FROM `tabCustomer`
    WHERE status = %(status)s
    AND territory = %(territory)s
""", {"status": "Active", "territory": "West"}, as_dict=True)

# ❌ NEVER do this (SQL injection risk)
# result = frappe.db.sql(f"SELECT * FROM `tabCustomer` WHERE status = '{status}'")
```

### Writing Data

```python
# Create document
doc = frappe.get_doc({
    "doctype": "Customer",
    "customer_name": "New Customer",
    "customer_type": "Company"
})
doc.insert()

# Update document (triggers validation)
doc = frappe.get_doc("Customer", "CUST-001")
doc.customer_name = "Updated Name"
doc.save()

# Quick update (bypasses controller - use sparingly)
frappe.db.set_value("Customer", "CUST-001", "status", "Inactive")

# Delete
frappe.delete_doc("Customer", "CUST-001")

# Commit transaction
frappe.db.commit()
```

## Background Jobs

```python
# Enqueue job
frappe.enqueue(
    "my_app.tasks.process_data",
    queue="default",  # short, default, long
    timeout=1800,     # 30 minutes
    customer="CUST-001"
)

# Task function (my_app/tasks.py)
def process_data(customer):
    """Background task"""
    frappe.init(site=frappe.local.site)
    frappe.connect()

    try:
        doc = frappe.get_doc("Customer", customer)
        doc.last_processed = frappe.utils.now()
        doc.save()
        frappe.db.commit()
    except Exception:
        frappe.log_error(title="Process Data Failed")
        raise
    finally:
        frappe.destroy()
```

## Scheduled Jobs (hooks.py)

```python
scheduler_events = {
    "all": [
        "my_app.tasks.every_minute"
    ],
    "daily": [
        "my_app.tasks.daily_report"
    ],
    "hourly": [
        "my_app.tasks.hourly_sync"
    ],
    "cron": {
        "0 9 * * 1": [  # Monday 9 AM
            "my_app.tasks.monday_morning"
        ]
    }
}
```

## Document Events via Hooks

```python
# hooks.py
doc_events = {
    "Sales Invoice": {
        "validate": "my_app.overrides.validate_invoice",
        "on_submit": "my_app.overrides.on_submit_invoice"
    },
    "*": {
        "on_update": "my_app.overrides.log_all_changes"
    }
}
```

```python
# my_app/overrides.py
import frappe

def validate_invoice(doc, method):
    """Called during Sales Invoice validation"""
    if doc.grand_total > 100000:
        if not doc.manager_approval:
            frappe.throw(_("Manager approval required"))

def on_submit_invoice(doc, method):
    """Called when Sales Invoice is submitted"""
    create_delivery_note(doc)
```

## Error Handling

```python
from frappe import _
from frappe.exceptions import ValidationError, PermissionError

def my_function():
    # Throw with message
    frappe.throw(_("Invalid data"))

    # Throw with title
    frappe.throw(_("Cannot proceed"), title=_("Error"))

    # Throw with exception type
    frappe.throw(_("Permission denied"), exc=PermissionError)

    # Message without stopping
    frappe.msgprint(_("Warning: Check your data"))

    # Log error
    frappe.log_error(
        title="My Error",
        message=frappe.get_traceback()
    )

    # Try-except
    try:
        risky_operation()
    except Exception:
        frappe.log_error("Operation failed")
        frappe.throw(_("Something went wrong"))
```

## Permission Checks

```python
# Check permission
if not frappe.has_permission("Customer", "write"):
    frappe.throw(_("Not permitted"), frappe.PermissionError)

# Check on specific document
if not frappe.has_permission("Customer", "delete", doc="CUST-001"):
    frappe.throw(_("Not permitted"), frappe.PermissionError)

# Get user roles
roles = frappe.get_roles()

# Check if user has role
if "Sales Manager" not in frappe.get_roles():
    frappe.throw(_("Not permitted"))
```

## Utilities

```python
from frappe.utils import (
    nowdate, nowtime, now_datetime,
    getdate, get_datetime,
    add_days, add_months, add_years,
    date_diff, flt, cint, cstr
)

# Date operations
today = nowdate()  # "2024-01-15"
week_later = add_days(nowdate(), 7)

# Number operations
amount = flt(value, 2)  # Float with precision
count = cint(value)     # Integer

# Current user
user = frappe.session.user
```

## Email & Notifications

```python
# Send email
frappe.sendmail(
    recipients=["user@example.com"],
    subject="Subject",
    message="Email body",
    reference_doctype="Sales Invoice",
    reference_name="SINV-00001"
)

# Real-time notification
frappe.publish_realtime(
    "msgprint",
    {"message": "Task completed"},
    user="user@example.com"
)
```

## Best Practices

**DO:**
- ✅ Use parameterized queries (prevent SQL injection)
- ✅ Check permissions in whitelisted methods
- ✅ Use `frappe.throw()` for validation errors
- ✅ Use `_(text)` for translatable strings
- ✅ Use `.save()` to trigger validation
- ✅ Log errors with `frappe.log_error()`

**DON'T:**
- ❌ Use f-strings in SQL queries (SQL injection risk)
- ❌ Skip permission checks in APIs
- ❌ Use `frappe.db.set_value()` to bypass validation
- ❌ Hardcode secrets in source code
- ❌ Use `print()` (use `frappe.log_error()` instead)
- ❌ Perform heavy operations in `validate()` (use background jobs)

## Security Checklist

- [ ] All `@frappe.whitelist()` methods check permissions
- [ ] All SQL queries use parameterization
- [ ] User input is validated
- [ ] Sensitive data is not logged
- [ ] Passwords are encrypted
- [ ] CSRF protection enabled (default)
- [ ] Rate limiting on public APIs

## Related

- [client-scripts](../client-scripts/SKILL.md) - Client-side JavaScript patterns
- [api-patterns](../api-patterns/SKILL.md) - REST/RPC API design
- [doctype-patterns](../doctype-patterns/SKILL.md) - DocType controller patterns
- [testing](../testing/SKILL.md) - Test patterns and coverage
- **Security Rules**: ~/.claude/rules/frappe/frappe-security.md
