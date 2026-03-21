# Frappe Common Utilities - Quick Reference

Quick lookup guide for the most frequently used Frappe utilities. Start here, then dive into category-specific skills.

## Most Used Functions

### Data Retrieval (Database)
```python
from frappe import get_value, get_all

# Get single value
email = get_value("Customer", "CUST-001", "email")

# Get record as dict
customer = get_value("Customer", "CUST-001", as_dict=True)

# Get list with filters
active = get_all("Customer", filters={"status": "Active"}, fields=["name"])

# Count records
total = frappe.db.count("Customer", filters={"status": "Active"})
```

**Go deeper:** [Database Utilities Skill](database-utilities.md)

---

### Validation
```python
from frappe.utils import validate_email_address, getdate

# Validate email
validate_email_address("user@example.com")

# Validate and convert date
date_obj = getdate("2024-03-21")

# Check if data is valid
if validate_phone_number_with_country_code(phone, "phone"):
    # Valid
    pass
```

**Go deeper:** [Validation Utilities Skill](validation-utilities.md)

---

### Formatting for Display
```python
from frappe.utils import format_date, format_currency, get_fullname

# Format date for UI
display_date = format_date("2024-03-21")  # "21-03-2024"

# Format currency
display_amt = format_currency(1000.50, "USD")  # "$1,000.50"

# Get user's full name
user_name = get_fullname("user@example.com")  # "John Doe"
```

**Go deeper:** [Formatting Utilities Skill](formatting-utilities.md)

---

### Type Conversion
```python
from frappe.utils import cint, flt, cstr

qty = cint(row.qty, default=0)          # String → Int, fallback 0
rate = flt(row.rate, 2)                 # String → Float, 2 decimals
text = cstr(obj.field)                  # Anything → String, handles None
```

**Go deeper:** [Common Type Conversion Patterns](database-utilities.md#type-conversion-utilities)

---

### API Endpoints
```python
from frappe import whitelist, get_arg, throw

@whitelist()
def my_api():
    # Permission check
    if not frappe.has_permission("Customer", "read"):
        throw(_("Not permitted"))

    # Get parameter
    customer_id = get_arg("customer")

    return {"data": "value"}
```

**Go deeper:** [API Utilities Skill](api-utilities.md)

---

## Utility by Use Case

### "I need to validate user input"
→ [Validation Utilities](validation-utilities.md)
- Email: `validate_email_address()`
- Phone: `validate_phone_number_with_country_code()`
- Dates: `getdate()` / `is_invalid_date_string()`
- HTML: `sanitize_html()`

### "I need to get data from database"
→ [Database Utilities](database-utilities.md)
- Single record: `frappe.get_value()`
- List: `frappe.get_all()`
- Exists check: `frappe.db.exists()`
- Count: `frappe.db.count()`

### "I need to display data in UI/report"
→ [Formatting Utilities](formatting-utilities.md)
- Dates: `format_date()`
- Currency: `format_currency()`
- Numbers: `format_number()`
- Users: `get_fullname()`, `get_formatted_email()`

### "I'm building an API endpoint"
→ [API Utilities](api-utilities.md)
- Create endpoint: `@frappe.whitelist()`
- Check permission: `frappe.has_permission()`
- Return error: `frappe.throw()`
- Rate limit: `@frappe.rate_limit()`

### "I need to update/create data"
→ [Database Utilities](database-utilities.md)
- Update single field: `frappe.db.set_value()`
- Update multiple: `frappe.db.update()`
- Create document: `frappe.get_doc(...).insert()`
- Transaction: `with frappe.db.transaction():`

---

## Lookup by Task

| Task | Function | Location |
|------|----------|----------|
| Validate email | `validate_email_address()` | Validation |
| Validate phone | `validate_phone_number_with_country_code()` | Validation |
| Check date format | `getdate()` or `is_invalid_date_string()` | Validation/Database |
| Get single value | `frappe.get_value()` | Database |
| Get list | `frappe.get_all()` | Database |
| Count records | `frappe.db.count()` | Database |
| Update field | `frappe.db.set_value()` | Database |
| Format date | `format_date()` | Formatting |
| Format money | `format_currency()` | Formatting |
| Format number | `format_number()` | Formatting |
| Get user name | `get_fullname()` | Formatting |
| Create API | `@frappe.whitelist()` | API |
| Check permission | `frappe.has_permission()` | API |
| Throw error | `frappe.throw()` | API |
| Rate limit | `@frappe.rate_limit()` | API |
| Convert int | `cint()` | Database |
| Convert float | `flt()` | Database |
| Convert string | `cstr()` | Database |

---

## Code Examples by Scenario

### Scenario 1: Validate and Save Customer Email

```python
from frappe.utils import validate_email_address

class Customer(Document):
    def validate(self):
        if self.email:
            try:
                self.email = validate_email_address(self.email)
            except frappe.InvalidEmailAddressError:
                frappe.throw(_("Invalid email"))
```

**Uses:** Validation Utilities → Email section

---

### Scenario 2: Fetch Active Customers and Display in Report

```python
from frappe import get_all
from frappe.utils import format_date, format_currency

def get_report_data(filters):
    customers = get_all("Customer",
        filters={"status": "Active", "territory": filters.territory},
        fields=["name", "customer_name", "creation", "outstanding_amount"],
        order_by="creation desc"
    )

    # Format for display
    data = []
    for c in customers:
        data.append({
            "name": c.name,
            "customer_name": c.customer_name,
            "joined": format_date(c.creation),
            "outstanding": format_currency(c.outstanding_amount, "USD")
        })

    return data
```

**Uses:** Database → get_all + Formatting → format_date, format_currency

---

### Scenario 3: Create API to Get Customer Balance

```python
from frappe import whitelist, get_arg, throw, has_permission, get_value
from frappe.utils import format_currency

@whitelist()
def get_customer_balance():
    customer_id = get_arg("customer")

    if not customer_id:
        throw(_("Customer is required"))

    if not has_permission("Customer", "read", doc=customer_id):
        throw(_("Not permitted"), frappe.PermissionError)

    balance = get_value("Customer", customer_id, "outstanding_amount") or 0

    return {
        "customer": customer_id,
        "balance": balance,
        "display": format_currency(balance, "USD")
    }
```

**Uses:** API → whitelist, get_arg, throw, has_permission + Database → get_value + Formatting → format_currency

---

### Scenario 4: Batch Update Customers in Territory

```python
from frappe import db
from frappe.utils import nowdate

# Mark all old inactive customers as archived
db.update("Customer",
    set={"status": "Archived", "archived_on": nowdate()},
    where={"status": "Inactive", "last_order_date": ["<", "2023-01-01"]}
)

# Or update specific field
db.set_value("Customer", "CUST-001", "territory", "New Territory")
```

**Uses:** Database → update, set_value

---

## Import Paths

### Frequently used imports:
```python
# Database
from frappe import get_value, get_all, db

# Validation
from frappe.utils import (
    validate_email_address,
    validate_phone_number_with_country_code,
    getdate,
    sanitize_html
)

# Formatting
from frappe.utils import (
    format_date,
    format_currency,
    format_number,
    get_fullname,
    format_datetime
)

# Type conversion
from frappe.utils import cint, flt, cstr

# API
from frappe import whitelist, get_arg, throw, has_permission, rate_limit

# General
import frappe
```

---

## Performance Tips

**DO:**
- Use `frappe.get_value()` for single records (not loading entire document)
- Use `frappe.db.set_value()` to update one field (not load + save)
- Use `frappe.get_all()` with specific fields (not loading all)
- Check `frappe.db.has_column()` before querying custom fields
- Use transactions for related multi-step operations

**DON'T:**
- Query in loops (N+1 problem)
- Load full document just to read one field
- Run queries without filters on large tables
- Skip pagination on list endpoints
- Assume fields exist without checking

---

## When to Reference Each Skill

### During Planning (`/plan`)
→ Review all 4 skills to understand what utilities are available

### Before Implementation (`/tdd`)
→ Check relevant skill before coding:
- Adding validation? Check Validation Utilities
- Querying data? Check Database Utilities
- Building form/report? Check Formatting Utilities
- Creating API? Check API Utilities

### During Code Review
→ Reviewer checks if developer:
- Used `frappe.get_value()` instead of loading full doc
- Used `format_currency()` instead of str()
- Used `validate_email_address()` instead of regex
- Used `@frappe.whitelist()` for APIs

### Reusable Skills
All four skills are designed to be:
- **Quick reference** - Find what you need in seconds
- **Copy-paste ready** - Examples work out of the box
- **Searchable** - Use your IDE search or Ctrl+F
- **Cross-linked** - Jump between related utilities

---

## Next Steps

1. **For validation work** → Go to [Validation Utilities](validation-utilities.md)
2. **For database work** → Go to [Database Utilities](database-utilities.md)
3. **For UI/report work** → Go to [Formatting Utilities](formatting-utilities.md)
4. **For API work** → Go to [API Utilities](api-utilities.md)

---

## How to Use These Skills During Development

```
Task: "Add customer discount validation"

1. Check quick reference (this file)
   → Finds "I need to validate user input" → Validation Utilities

2. Read Validation Utilities skill
   → Finds: validate_email_address(), getdate(), sanitize_html()

3. Check Database Utilities for storing
   → Finds: frappe.get_value(), frappe.db.set_value()

4. Check Formatting Utilities for display
   → Finds: format_currency()

5. Code with confidence using found utilities
```

---

## Pro Tips

- **Save these as favorites** in your IDE for quick access
- **Search within skill** using Ctrl+F for specific function
- **Use IDE quick links** to jump between related skills
- **Keep browser tab open** while coding for reference
- **Share skills with team** - consistent patterns across projects