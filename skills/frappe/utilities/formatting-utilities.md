# Frappe Formatting Utilities

Display and format functions for user-facing output. Use these to consistently format data for display in UI, reports, and emails.

## Date & Time Formatting

### `format_date(value, format_str=None)`
Format date/datetime for display based on system settings.

**Use when:** Displaying dates in UI, reports, emails
```python
from frappe.utils import format_date

formatted = format_date("2024-03-21")  # "21-03-2024" or "03/21/2024" based on locale

# With custom format
formatted = format_date("2024-03-21", "yyyy-MM-dd")  # "2024-03-21"
```

**Features:**
- Respects user locale settings
- Handles invalid dates gracefully
- System format override support

---

### `format_datetime(value, format_str=None)`
Format datetime with time component.

**Use when:** Displaying timestamps
```python
from frappe.utils import format_datetime

ts = format_datetime("2024-03-21 15:30:45")
# Output: "21-03-2024 3:30 PM" (locale-specific)
```

---

### `format_time(value)`
Format time in user's locale.

**Use when:** Displaying time in forms, reports
```python
from frappe.utils import format_time

display_time = format_time("15:30:45")  # "3:30 PM" or "15:30" based on locale
```

---

### `get_formatted_date(date_string)`
Get date as human-readable string (e.g., "21 Mar 2024").

**Use when:** Displaying dates in natural language
```python
display = get_formatted_date("2024-03-21")  # "21 Mar 2024"
```

---

## Currency & Money Formatting

### `format_currency(value, currency=None, precision=None)`
Format currency for display with proper symbol and decimals.

**Use when:** Displaying prices, amounts in UI
```python
from frappe.utils import format_currency

# Auto-detect currency from system settings
display = format_currency(1000.50)  # "$1,000.50" or "₹1,000.50" etc.

# Explicit currency
display = format_currency(1000.50, "USD")  # "$1,000.50"
display = format_currency(1000.50, "INR", precision=0)  # "₹1,001"
```

**Features:**
- Adds currency symbol
- Proper grouping (1,000 not 1000)
- Respects precision settings
- Locale-aware

---

### `fmt_money(amount, precision=None, currency=None)`
Alternative to format_currency - similar functionality.

```python
from frappe.utils import fmt_money

display = fmt_money(2500, precision=2, currency="USD")  # "$2,500.00"
```

---

## Number Formatting

### `format_number(value, precision=None)`
Format number with locale-aware grouping.

**Use when:** Displaying quantities, percentages, metrics
```python
from frappe.utils import format_number

qty = format_number(1000000)  # "1,000,000"
percentage = format_number(98.5, precision=1)  # "98.5"
```

---

### `flt_to_str(value, precision=None)`
Convert float to string with specific precision.

**Use when:** Storing/displaying floats with consistent decimals
```python
from frappe.utils import flt_to_str

display = flt_to_str(100.5, precision=2)  # "100.50"
```

---

## Text/Email Formatting

### `get_fullname(user=None)`
Get user's full name (first + last).

**Use when:** Displaying user names in UI, emails
```python
from frappe.utils import get_fullname

name = get_fullname("user@example.com")  # "John Doe"
name = get_fullname()  # Current user's full name
```

---

### `get_formatted_email(user, mail=None)`
Get email formatted as: "John Doe <john@example.com>".

**Use when:** Displaying email addresses
```python
from frappe.utils import get_formatted_email

display = get_formatted_email("user@example.com")
# "John Doe <user@example.com>"
```

---

### `extract_email_id(email)`
Extract just the email part from "Name <email>" format.

**Use when:** Getting email address from formatted string
```python
from frappe.utils import extract_email_id

email = extract_email_id("John Doe <john@example.com>")  # "john@example.com"
```

---

## HTML & Markdown Formatting

### `get_html_format(data_dict)`
Convert data dictionary to formatted HTML for display.

**Use when:** Creating formatted HTML views of structured data
```python
from frappe.utils import get_html_format

html = get_html_format({
    "customer": "CUST-001",
    "amount": 5000,
    "status": "Paid"
})
```

---

### `markdown(text)`
Convert markdown to HTML safely.

**Use when:** Displaying user-provided formatted text
```python
from frappe.utils import markdown

html = markdown("# Title\n**Bold text**")
```

---

## Common Formatting in Reports

### Currency Field in Report
```python
# In report script
{
    "label": "Amount",
    "fieldname": "amount",
    "fieldtype": "Currency",
    "width": 100,
    "options": "currency"
}

# Values automatically formatted based on field type
```

### Date Field in Report
```python
{
    "label": "Order Date",
    "fieldname": "order_date",
    "fieldtype": "Date",
    "width": 100
}
```

---

## HTML to Text

### `html_to_text(html)`
Strip HTML tags, keep text content.

**Use when:** Converting HTML email to plain text
```python
from frappe.utils import html_to_text

text = html_to_text("<p>Hello <b>World</b></p>")
# "Hello World"
```

---

## Slug/URL Formatting

### `slugify(text)`
Convert text to URL-safe slug.

**Use when:** Creating URL-friendly names
```python
from frappe.utils import slugify

slug = slugify("My Product Name")  # "my-product-name"
```

---

## Abbreviation/Truncation

### `truncate(text, length=100, suffix="...")`
Truncate text to length with suffix.

**Use when:** Displaying long text in lists, cards
```python
text = truncate("Very long description here", length=20)
# "Very long descripti..."
```

---

## Best Practices

**ALWAYS:**
- ✅ Use `format_currency()` for money display (not just str())
- ✅ Use `format_date()` for dates (respects locale)
- ✅ Use `format_number()` for quantities
- ✅ Use field types in forms (Currency, Date, etc.) - auto-formats
- ✅ Use `get_formatted_email()` for email display
- ✅ Use `html_to_text()` before storing user HTML

**NEVER:**
- ❌ Use str(float) for currency: `str(1000.5)` → "1000.5" ✗
- ❌ Hardcode currency symbols: `f"${amount}"` ✗
- ❌ Store dates as strings in UI (use getdate first)
- ❌ Display raw timestamps (use format_datetime)
- ❌ Manually truncate text (use framework function)

---

## Report Formatting Pattern

```python
# In report script
def get_report_columns():
    return [
        {
            "label": "Customer",
            "fieldname": "customer_name",
            "fieldtype": "Link",
            "options": "Customer",
            "width": 150
        },
        {
            "label": "Amount",
            "fieldname": "amount",
            "fieldtype": "Currency",  # Auto-formats!
            "width": 120
        },
        {
            "label": "Date",
            "fieldname": "order_date",
            "fieldtype": "Date",  # Auto-formats!
            "width": 100
        },
        {
            "label": "Status",
            "fieldname": "status",
            "fieldtype": "Select",
            "options": "Draft\nSubmitted\nCancelled",
            "width": 100
        }
    ]
```

---

## Common Use Cases in DocTypes

### In Child Table (Item List)
```python
{
    "fieldname": "items",
    "fieldtype": "Table",
    "fields": [
        {
            "fieldname": "item_code",
            "label": "Item",
            "fieldtype": "Link",
            "options": "Item"
        },
        {
            "fieldname": "qty",
            "label": "Quantity",
            "fieldtype": "Float",
            "precision": "3"  # Auto-formats: 10.500
        },
        {
            "fieldname": "rate",
            "label": "Rate",
            "fieldtype": "Currency",  # Auto-formats: $100.00
            "options": "currency"
        },
        {
            "fieldname": "amount",
            "label": "Amount",
            "fieldtype": "Currency",
            "options": "currency",
            "read_only": 1
        }
    ]
}
```

---

## Related

- **Validation Utilities** - Validate before formatting
- **Database Utilities** - Get raw data from database before formatting
- **API Utilities** - Return formatted data in API responses
- **Frappe Conventions** - Field type patterns

## When to Use This Skill

Use this skill when:
- Building report columns
- Creating email templates with formatted data
- Displaying data in forms and list views
- Converting database values for API responses
- Implementing custom display logic