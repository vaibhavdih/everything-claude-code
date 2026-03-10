# Frappe Coding Conventions

These conventions apply automatically when a Frappe project is detected.

## Naming Conventions

### DocType Names
- **PascalCase**: `Customer`, `SalesOrder`, `PaymentEntry`
- **Singular form**: `Customer` not `Customers`
- **Descriptive**: Clearly indicate purpose
- **No abbreviations**: `SalesOrder` not `SO`

### Field Names
- **snake_case**: `customer_name`, `email_address`, `is_active`
- **Descriptive**: No abbreviations unless standard (`qty` is acceptable)
- **Consistent**: Use same names across DocTypes (`customer_name` not `cust_name`)
- **Boolean prefix**: `is_`, `has_`, `can_` (e.g., `is_active`, `has_transactions`)

### Module Names
- **Title Case With Spaces**: `Sales`, `CRM`, `Inventory Management`
- **Clear purpose**: Describes the domain
- **Not too granular**: 3-8 modules typical for an app

### Method Names
- **snake_case**: `validate_email()`, `calculate_total()`, `send_notification()`
- **Verb-based**: Start with action verb
- **Descriptive**: Clear what the method does

### File Names
- **snake_case**: `customer.py`, `sales_order.js`, `test_customer.py`
- **Match DocType**: File name matches DocType name in snake_case

## File Organization

### App Structure
```
custom_app/
├── custom_app/
│   ├── hooks.py           # App configuration
│   ├── modules.txt        # Module list
│   ├── {module}/          # One folder per module
│   │   ├── doctype/
│   │   ├── report/
│   │   └── page/
│   ├── api/               # API endpoints
│   ├── public/            # Static files
│   └── templates/         # Jinja templates
├── requirements.txt
└── setup.py
```

### DocType Files
```
customer/
├── customer.json          # Schema
├── customer.py            # Controller
├── customer.js            # Client script
├── customer_list.js       # List view (optional)
├── customer_dashboard.py  # Dashboard (optional)
└── test_customer.py       # Tests
```

## Code Style

### Python (Server-Side)

Follow PEP 8 with Frappe-specific patterns:

```python
# Good: Frappe imports first, then standard library
import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import nowdate, flt

# Then standard library
import json
from datetime import datetime

class Customer(Document):
    """Customer DocType Controller

    Handles customer creation, validation, and business logic.
    """

    def validate(self):
        """Validation before save"""
        self.validate_email()
        self.set_full_name()

    def validate_email(self):
        """Ensure email is unique and valid"""
        if self.email and not frappe.utils.validate_email_address(self.email):
            frappe.throw(_("Invalid email address"))

    def before_insert(self):
        """Called before insert"""
        pass

    def after_insert(self):
        """Called after insert"""
        self.create_welcome_email()
```

**Key Points:**
- Use `frappe.throw()` for validation errors
- Use `_(text)` for translatable strings
- Docstrings for all classes and public methods
- Type hints optional but encouraged
- 4-space indentation
- Max line length: 100 characters

### JavaScript (Client-Side)

```javascript
// Good: Event-driven pattern
frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        // Form load logic
        if (!frm.is_new()) {
            frm.add_custom_button(__('View Orders'), () => {
                frappe.set_route('List', 'Sales Order', {
                    'customer': frm.doc.name
                });
            });
        }
    },

    email: function(frm) {
        // Field change handler
        if (frm.doc.email) {
            validate_email(frm);
        }
    }
});

function validate_email(frm) {
    // Helper function
    if (!frappe.utils.validate_email(frm.doc.email)) {
        frappe.msgprint(__('Invalid email format'));
        frm.set_value('email', '');
    }
}
```

**Key Points:**
- Use `frappe.ui.form.on()` pattern
- Use `__()` for translatable strings
- Use arrow functions for callbacks
- camelCase for function names
- Semicolons required
- 4-space indentation (or tabs, be consistent)

## Database Patterns

### Queries

```python
# Good: Use frappe.db methods (SQL injection safe)
customers = frappe.get_all("Customer",
    filters={"status": "Active"},
    fields=["name", "customer_name", "email"],
    order_by="creation desc"
)

# Good: Get single value
email = frappe.db.get_value("Customer", "CUST-001", "email")

# Acceptable: Raw SQL with parameters
results = frappe.db.sql("""
    SELECT name, customer_name
    FROM `tabCustomer`
    WHERE status = %(status)s
""", {"status": "Active"}, as_dict=True)

# Bad: Raw SQL with string formatting (SQL injection risk)
results = frappe.db.sql(f"SELECT * FROM `tabCustomer` WHERE status = '{status}'")
```

### Document Operations

```python
# Good: Use Document API (triggers hooks)
customer = frappe.get_doc("Customer", "CUST-001")
customer.status = "Inactive"
customer.save()

# Bad: Direct DB update (bypasses validation)
frappe.db.set_value("Customer", "CUST-001", "status", "Inactive")
```

## Error Handling

```python
# Good: Use frappe.throw() with error types
if not self.customer_name:
    frappe.throw(_("Customer Name is mandatory"), frappe.MandatoryError)

if not frappe.has_permission("Customer", "delete"):
    frappe.throw(_("Not permitted"), frappe.PermissionError)

# Good: Log errors for debugging
try:
    external_api_call()
except Exception as e:
    frappe.log_error(frappe.get_traceback(), "External API Error")
    frappe.throw(_("External service unavailable"))
```

## API Conventions

```python
# Good: Whitelisted method with permission check
@frappe.whitelist()
def get_customer_balance(customer):
    """Get customer outstanding balance

    Args:
        customer (str): Customer ID

    Returns:
        dict: Balance information
    """
    if not frappe.has_permission("Customer", "read"):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    balance = frappe.db.get_value("Customer", customer, "outstanding_amount")

    return {
        "customer": customer,
        "balance": balance or 0.0
    }
```

## Configuration

### hooks.py

```python
# Good: Organized hooks configuration
app_name = "custom_app"
app_title = "Custom App"
app_publisher = "Your Company"
app_description = "Description"
app_email = "contact@company.com"
app_license = "MIT"

# App dependencies
required_apps = ["frappe"]

# Document Events
doc_events = {
    "Customer": {
        "validate": "custom_app.crm.customer.validate_customer",
        "on_update": "custom_app.crm.customer.on_customer_update"
    }
}

# Scheduled Tasks
scheduler_events = {
    "daily": [
        "custom_app.tasks.send_daily_report"
    ]
}

# Fixtures
fixtures = [
    "Custom Field",
    {"dt": "Role", "filters": [["name", "in", ["CRM Manager"]]]}
]
```

## Testing Conventions

```python
# Good: Descriptive test names and setup/teardown
class TestCustomer(unittest.TestCase):
    """Test Customer DocType"""

    def setUp(self):
        """Setup test data"""
        self.test_customer = make_test_customer()

    def tearDown(self):
        """Cleanup"""
        frappe.db.rollback()

    def test_customer_creation_with_valid_data(self):
        """Test creating customer with valid data succeeds"""
        customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Test Customer",
            "email": "test@example.com"
        })
        customer.insert()

        self.assertEqual(customer.customer_name, "Test Customer")
        self.assertTrue(frappe.db.exists("Customer", customer.name))

    def test_duplicate_email_raises_validation_error(self):
        """Test duplicate email is prevented"""
        # Create first customer
        customer1 = make_test_customer(email="duplicate@test.com")

        # Try to create second with same email
        customer2 = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Customer 2",
            "email": "duplicate@test.com"
        })

        with self.assertRaises(frappe.ValidationError):
            customer2.insert()
```

## Documentation

### Docstrings

```python
def calculate_discount(amount, discount_type, discount_value):
    """Calculate discount amount

    Calculates discount based on type (Percentage or Amount).

    Args:
        amount (float): Base amount
        discount_type (str): "Percentage" or "Amount"
        discount_value (float): Discount value

    Returns:
        float: Discount amount

    Raises:
        ValueError: If discount_type is invalid

    Example:
        >>> calculate_discount(1000, "Percentage", 10)
        100.0
        >>> calculate_discount(1000, "Amount", 50)
        50.0
    """
    if discount_type == "Percentage":
        return amount * (discount_value / 100)
    elif discount_type == "Amount":
        return discount_value
    else:
        raise ValueError(f"Invalid discount type: {discount_type}")
```

## Best Practices

**ALWAYS:**
- ✅ Use `frappe.db` methods instead of raw SQL
- ✅ Check permissions in whitelisted methods
- ✅ Use `_(text)` for user-facing strings
- ✅ Validate data in `validate()` method
- ✅ Write tests for all controllers
- ✅ Document complex logic
- ✅ Use proper field types (Currency for money, not Float)
- ✅ Follow PascalCase for DocTypes, snake_case for fields

**NEVER:**
- ❌ Modify core Frappe/ERPNext code
- ❌ Skip permission checks in APIs
- ❌ Use string formatting in SQL queries
- ❌ Hardcode site-specific data in app code
- ❌ Create circular app dependencies
- ❌ Use abbreviations in names
- ❌ Put business logic in client scripts
- ❌ Bypass validation with direct DB updates

## Version Control

### .gitignore

```
*.pyc
*.swp
*.swo
*~
*.egg-info
__pycache__
.DS_Store
node_modules/
```

### Commit Messages

```
# Good: Descriptive commit messages
feat: add customer credit limit validation
fix: prevent duplicate email addresses in Customer
refactor: simplify order total calculation
test: add unit tests for customer validation
docs: update customer API documentation

# Bad: Vague commit messages
fix bug
update code
changes
```

## Deployment Conventions

- Use `bench migrate` after schema changes
- Clear cache after configuration changes
- Test on staging before production
- Always backup before major changes
- Use version tags for releases
- Document breaking changes in CHANGELOG
