# Frappe Validation Utilities

Essential validation functions from `frappe.utils` for common data validation tasks. Use these before implementing custom validation logic.

## Email Validation

### `validate_email_address(email: str) -> str`
Validates and returns email address if valid, raises exception if invalid.

**Use when:** Validating user email input
```python
from frappe.utils import validate_email_address

# In DocType controller
def validate(self):
    if self.email:
        try:
            self.email = validate_email_address(self.email)
        except frappe.InvalidEmailAddressError:
            frappe.throw(_("Invalid email address"))
```

**Handles:**
- Multiple email formats
- Whitespace trimming
- Case normalization
- Invalid characters detection

---

## Phone Number Validation

### `validate_phone_number_with_country_code(phone: str, fieldname: str) -> None`
Validates phone number against phonenumbers library with country code support.

**Use when:** Accepting international phone numbers
```python
from frappe.utils import validate_phone_number_with_country_code

def validate(self):
    if self.phone:
        validate_phone_number_with_country_code(self.phone, "phone")
```

**Features:**
- Country code validation
- International format support
- Region-aware validation

---

## Person Name Validation

### `is_valid_person_name(name: str) -> bool`
Validates if string follows person name pattern (alphanumeric, hyphens, apostrophes).

**Use when:** Validating customer/employee names
```python
from frappe.utils import is_valid_person_name

if not is_valid_person_name(self.customer_name):
    frappe.throw(_("Customer name contains invalid characters"))
```

---

## Date Validation

### `getdate(date_string: str, parse_day_first: bool = False) -> date`
Safely converts string to Python date object. Returns None if invalid.

**Use when:** Converting user input to dates
```python
from frappe.utils import getdate

def validate(self):
    try:
        transaction_date = getdate(self.transaction_date)
        if transaction_date > getdate():
            frappe.throw(_("Date cannot be in future"))
    except:
        frappe.throw(_("Invalid date format"))
```

**Features:**
- Multiple date formats supported
- Day-first parsing option
- Handles invalid dates gracefully

### `is_invalid_date_string(date_str: str) -> bool`
Pre-check before parsing: returns True if date string is obviously invalid.

**Use when:** Quick validation before expensive parsing
```python
if is_invalid_date_string(date_str):
    return False  # Skip expensive validation
```

---

## URL/Link Validation

### `is_valid_http_url(url: str) -> bool`
Validates if string is a valid HTTP/HTTPS URL.

**Use when:** Validating website URLs, webhook endpoints
```python
from frappe.utils import is_valid_http_url

def validate(self):
    if self.webhook_url and not is_valid_http_url(self.webhook_url):
        frappe.throw(_("Invalid webhook URL"))
```

---

## HTML/Text Sanitization

### `sanitize_html(html: str, allowed_tags=None) -> str`
Sanitizes HTML to prevent XSS attacks.

**Use when:** Accepting rich text or HTML from users
```python
from frappe.utils import sanitize_html

def validate(self):
    if self.description:
        self.description = sanitize_html(self.description)
```

**Features:**
- Removes malicious scripts
- Preserves safe formatting
- Configurable allowed tags

---

## String Pattern Validation

### `is_valid_mobile_phone(phone: str) -> bool`
Validates mobile phone number pattern.

```python
if is_valid_mobile_phone(self.mobile):
    # Valid mobile format
    pass
```

### Check Against Regular Expression Patterns

Frappe provides pre-compiled patterns:
```python
from frappe.utils import (
    EMAIL_STRING_PATTERN,      # Email addresses
    PHONE_NUMBER_PATTERN,      # Phone numbers
    PERSON_NAME_PATTERN,       # Person names
    MULTI_EMAIL_STRING_PATTERN # Comma/newline separated emails
)

# Use in validation
if EMAIL_STRING_PATTERN.match(email):
    self.email = email
```

---

## Best Practices

**ALWAYS:**
- ✅ Use `validate_email_address()` instead of regex for emails
- ✅ Use `validate_phone_number_with_country_code()` for international numbers
- ✅ Use `sanitize_html()` before storing user-provided HTML
- ✅ Use `getdate()` for date conversions (handles edge cases)
- ✅ Use framework patterns before writing custom validation

**NEVER:**
- ❌ Write regex for email validation (use framework function)
- ❌ Accept HTML without sanitizing
- ❌ Store dates as strings (use getdate() → datetime.date)
- ❌ Skip validation on "internal" fields (always validate)

---

## Related

- **Database Utilities** - For querying/storing validated data
- **Formatting Utilities** - For formatting validated data for display
- **Frappe Conventions** - Validation patterns in controllers

## When to Use This Skill

Use this skill when:
- Implementing validation in DocType controller
- Building custom API endpoints that accept user input
- Creating forms with client-side to server-side validation
- Writing tests for validation logic
- Reviewing code for missing validation