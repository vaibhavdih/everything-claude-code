# Frappe Database Utilities

Essential database query and manipulation functions from `frappe.db` and `frappe.utils.data`. Use these for safe, efficient database operations.

## CRITICAL: Always Use These - NEVER Raw SQL String Formatting

**Most Common Database Operations:**

### `frappe.get_value(doctype, name, fieldname=None, as_dict=False)`
Get a single value or document from database.

**Use when:** Fetching single records
```python
from frappe import get_value

# Get single field
email = get_value("Customer", "CUST-001", "email")

# Get multiple fields as dict
customer_data = get_value("Customer", "CUST-001",
    ["customer_name", "email", "territory"], as_dict=True)
# Returns: {"customer_name": "...", "email": "...", "territory": "..."}

# Fetch by filtering
balance = get_value("Customer",
    filters={"email": "test@example.com"},
    fieldname="outstanding_amount")
```

**Why use it:**
- SQL injection safe (parameterized)
- Handles NULL values gracefully
- Converts field types automatically
- Returns None if not found (safe)

---

### `frappe.get_all(doctype, filters=None, fields=None, order_by=None, limit_page_length=None, as_dict=True)`
Get multiple records with filtering, ordering, and pagination.

**Use when:** Fetching lists with filters
```python
from frappe import get_all

# Simple list
customers = get_all("Customer", fields=["name", "customer_name", "email"])

# With filtering
active_customers = get_all("Customer",
    filters={"status": "Active", "territory": "North"},
    fields=["name", "customer_name"],
    order_by="customer_name asc",
    limit_page_length=100
)

# Complex filtering
high_value = get_all("Customer",
    filters={
        "status": "Active",
        "outstanding_amount": [">", 10000]
    },
    fields=["name", "outstanding_amount"],
    order_by="outstanding_amount desc"
)

# Filter in/not in
regions = get_all("Customer",
    filters={"territory": ["in", ["North", "South", "East"]]},
    fields=["name", "territory"]
)
```

**Why use it:**
- Clean, readable syntax
- SQL injection safe
- Built-in pagination
- Automatic field type conversion
- Performance optimized

---

### `frappe.db.count(doctype, filters=None)`
Count records matching filters efficiently.

**Use when:** Getting total count without fetching data
```python
from frappe import db

total_customers = db.count("Customer")
active_count = db.count("Customer", filters={"status": "Active"})
```

---

## Database Transactions

### `frappe.db.transaction()`
Context manager for database transactions - rolls back on exception.

**Use when:** Multiple related operations that must succeed together
```python
from frappe import db

try:
    with db.transaction():
        # Create order
        order = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": "CUST-001",
            "items": [...]
        }).insert()

        # Update customer
        frappe.db.set_value("Customer", "CUST-001", "last_order_date", nowdate())

        # Both succeed or both rollback
except Exception as e:
    frappe.log_error(frappe.get_traceback(), "Order Creation")
    frappe.throw("Order creation failed")
```

---

## Batch Operations

### `frappe.db.set_value(doctype, name, fieldname, value)`
Update single field efficiently.

**Use when:** Updating single field without fetching entire document
```python
from frappe import db

# Update one field
db.set_value("Customer", "CUST-001", "status", "Inactive")

# Update multiple fields (pass dict)
db.set_value("Customer", "CUST-001", {
    "status": "Inactive",
    "last_order_date": None
})
```

**Why:** Faster than loading document and saving

---

### `frappe.db.update(doctype, updates_dict, filters=None)`
Batch update multiple records matching filters.

**Use when:** Updating many records at once
```python
from frappe import db

# Update all customers in a territory
db.update("Customer",
    set={"territory": "New Territory"},
    where={"territory": "Old Territory"}
)

# With multiple conditions
db.update("Sales Order",
    set={"status": "Cancelled"},
    where={"status": "Draft", "creation": ["<", "2024-01-01"]}
)
```

---

## Safe Raw SQL (When Necessary)

### Use Parameterization - ALWAYS

**✅ GOOD: Parameterized query**
```python
from frappe import db

results = db.sql("""
    SELECT name, customer_name, outstanding_amount
    FROM `tabCustomer`
    WHERE status = %(status)s
    AND territory = %(territory)s
    ORDER BY customer_name ASC
""", {
    "status": status,
    "territory": territory
}, as_dict=True)
```

**❌ BAD: String formatting (SQL INJECTION!)**
```python
# NEVER DO THIS
results = db.sql(f"SELECT * FROM `tabCustomer` WHERE status = '{status}'")
```

---

## Existence Checks

### `frappe.db.exists(doctype, name)`
Check if document exists efficiently.

**Use when:** Before performing operations
```python
from frappe import db

if db.exists("Customer", customer_name):
    # Update existing
    doc = frappe.get_doc("Customer", customer_name)
else:
    # Create new
    doc = frappe.get_doc({"doctype": "Customer", ...})
```

---

## Relationship Queries

### Get all children of a document
```python
# Instead of loading entire parent:
children = get_all("Sales Order Item",
    filters={"parent": order_name},
    fields=["name", "item_code", "qty"]
)
```

---

## Type Conversion Utilities

### `cint(value: Any, default: int = 0) -> int`
Convert to integer safely.
```python
qty = cint(row.qty, default=0)  # Returns 0 if not a number
```

### `flt(value: Any, precision: int = 2) -> float`
Convert to float with precision.
```python
from frappe.utils import flt

rate = flt(item.rate, 2)  # 100.456 → 100.46
```

### `cstr(value: Any, encoding: str = "utf-8") -> str`
Convert to string safely, handles None.
```python
from frappe.utils import cstr

text = cstr(obj.field)  # None → ""
```

---

## Check Column Exists

### `frappe.db.has_column(doctype, fieldname)`
Check if field exists on DocType before querying.

```python
if frappe.db.has_column("Customer", "custom_field"):
    # Safe to query
    results = get_all("Customer", fields=["custom_field"])
```

---

## Best Practices

**ALWAYS:**
- ✅ Use `frappe.get_all()` for lists
- ✅ Use `frappe.get_value()` for single records
- ✅ Use `frappe.db.set_value()` for simple updates
- ✅ Use parameterized SQL `%(param)s` if raw SQL needed
- ✅ Use transactions for related operations
- ✅ Check `frappe.db.has_column()` before querying custom fields
- ✅ Use type converters: `cint()`, `flt()`, `cstr()`

**NEVER:**
- ❌ Use string formatting in SQL: `f"... WHERE id = '{id}'"`
- ❌ Load full document just to update one field
- ❌ Run N+1 queries (query in loop)
- ❌ Skip error handling in transactions
- ❌ Assume fields exist without checking

---

## Common Patterns

### Pattern: Get with default
```python
value = get_value("DocType", name, "field") or "default"
```

### Pattern: Get by filter
```python
doc = get_value("Customer", filters={"email": email})
```

### Pattern: Count with filter
```python
count = db.count("Order", filters={"status": "Pending"})
```

### Pattern: Batch update
```python
db.update("Customer",
    set={"updated_at": now_datetime()},
    where={"status": "Active"}
)
```

---

## Related

- **Validation Utilities** - Validate before storing in database
- **Formatting Utilities** - Format values retrieved from database
- **API Utilities** - Database queries in REST endpoints
- **Frappe Security Rules** - SQL injection prevention

## When to Use This Skill

Use this skill when:
- Querying database in DocType methods
- Building API endpoints that fetch data
- Performing batch updates or cleanup
- Writing database-related tests
- Reviewing code for N+1 queries or SQL injection