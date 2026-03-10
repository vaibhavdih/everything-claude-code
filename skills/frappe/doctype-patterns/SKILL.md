---
name: frappe-doctype-patterns
description: DocType development patterns - field types, naming conventions, controllers, validation, and best practices for Frappe's core abstraction.
origin: ECC
---

# Frappe DocType Development Patterns

Comprehensive guide to creating and managing DocTypes in Frappe framework.

## When to Activate

- Creating new DocTypes
- Modifying existing DocTypes
- Designing database schemas
- Implementing business logic in controllers
- Adding validations and workflows

## What is a DocType?

A DocType is Frappe's abstraction for a database table with:
- **Schema** (fields, permissions, settings) - JSON definition
- **Controller** (business logic) - Python class
- **Client Script** (UI behavior) - JavaScript
- **Tests** (unit tests) - Python test class

```
DocType = Model + Controller + View + Tests
```

## DocType Structure

```
customer/
├── customer.json          # Schema definition
├── customer.py            # Server-side controller
├── customer.js            # Client-side script
├── customer_list.js       # List view customization (optional)
├── customer_dashboard.py  # Dashboard config (optional)
└── test_customer.py       # Unit tests
```

## Field Types

### Common Field Types

| Type | Usage | Example |
|------|-------|---------|
| **Data** | Short text (max 140 chars) | Name, Email, Phone |
| **Text** | Long text | Address, Description |
| **Long Text** | Very long text with editor | Terms & Conditions |
| **Int** | Integer numbers | Quantity, Count |
| **Float** | Decimal numbers | Amount, Percentage |
| **Currency** | Money values | Price, Total |
| **Date** | Date only | Birth Date |
| **Datetime** | Date and time | Created At |
| **Time** | Time only | Office Hours |
| **Check** | Boolean | Is Active, Enabled |
| **Select** | Dropdown | Status, Type |
| **Link** | Foreign key to another DocType | Customer, Item |
| **Table** | Child table (one-to-many) | Order Items |
| **Attach** | File upload | Image, Document |
| **Attach Image** | Image upload with preview | Profile Picture |
| **HTML** | Rich HTML content | Description |
| **Code** | Code editor | Custom Script |
| **JSON** | JSON data | API Response |
| **Password** | Encrypted password | User Password |
| **Read Only** | Computed/display only | Total Amount |
| **Button** | Custom action button | Generate Invoice |

### Field Options Example

```json
{
    "fieldname": "customer_name",
    "fieldtype": "Data",
    "label": "Customer Name",
    "reqd": 1,
    "unique": 1,
    "in_list_view": 1,
    "in_standard_filter": 1,
    "translatable": 1,
    "bold": 1,
    "read_only": 0,
    "description": "Full name of the customer",
    "options": null
}
```

### Select Field Options

```json
{
    "fieldname": "status",
    "fieldtype": "Select",
    "label": "Status",
    "options": "Active\nInactive\nSuspended",
    "default": "Active"
}
```

### Link Field (Foreign Key)

```json
{
    "fieldname": "customer",
    "fieldtype": "Link",
    "label": "Customer",
    "options": "Customer",
    "reqd": 1
}
```

### Table Field (Child DocType)

```json
{
    "fieldname": "items",
    "fieldtype": "Table",
    "label": "Items",
    "options": "Sales Order Item"
}
```

## Naming Conventions

### DocType Names
- **PascalCase**: `SalesOrder`, `CustomerGroup`, `ItemPrice`
- **Descriptive**: Clear purpose
- **Singular**: `Customer` not `Customers`

### Field Names
- **snake_case**: `customer_name`, `email_address`, `is_active`
- **Descriptive**: No abbreviations unless standard
- **Consistent**: Use same names across DocTypes

### Module Names
- **Title Case With Spaces**: `Sales`, `CRM`, `Inventory Management`

## DocType Controller Patterns

### Basic Controller

```python
# customer.py
import frappe
from frappe.model.document import Document
from frappe import _

class Customer(Document):
    """Customer DocType Controller"""

    def validate(self):
        """Called before insert and update"""
        self.validate_email()
        self.set_full_name()
        self.check_duplicate()

    def before_insert(self):
        """Called only before insert"""
        self.set_default_values()

    def after_insert(self):
        """Called after successful insert"""
        self.create_welcome_email()

    def on_update(self):
        """Called after successful update"""
        self.sync_to_crm()

    def on_trash(self):
        """Called before delete"""
        self.check_linked_documents()

    def on_submit(self):
        """Called when document is submitted (if submittable)"""
        self.lock_fields()

    def on_cancel(self):
        """Called when submitted document is cancelled"""
        self.unlock_fields()
```

### Validation Patterns

```python
def validate(self):
    """Validation before save"""

    # 1. Required field validation
    if not self.customer_name:
        frappe.throw(_("Customer Name is mandatory"))

    # 2. Email validation
    if self.email and not frappe.utils.validate_email_address(self.email):
        frappe.throw(_("Invalid email address"))

    # 3. Duplicate check
    if frappe.db.exists("Customer", {
        "email": self.email,
        "name": ["!=", self.name]
    }):
        frappe.throw(_("Customer with this email already exists"))

    # 4. Date validation
    if self.end_date and self.start_date and self.end_date < self.start_date:
        frappe.throw(_("End Date cannot be before Start Date"))

    # 5. Amount validation
    if self.credit_limit and self.credit_limit < 0:
        frappe.throw(_("Credit Limit cannot be negative"))

    # 6. Status transition validation
    if self.has_value_changed("status"):
        self.validate_status_change()
```

### Auto-Naming Patterns

```python
# In customer.json
{
    "autoname": "field:customer_name"  # Use customer_name as ID
}

# Or with series
{
    "autoname": "naming_series:"  # CUST-00001, CUST-00002
}

# Or custom autoname in controller
def autoname(self):
    """Custom naming logic"""
    self.name = f"CUST-{self.customer_type[:3].upper()}-{frappe.utils.nowdate()}"
```

### Computed Fields

```python
def validate(self):
    """Calculate computed fields"""
    self.calculate_total()
    self.set_age()

def calculate_total(self):
    """Calculate total from child table"""
    self.total = sum(item.amount for item in self.items)

def set_age(self):
    """Calculate age from birth_date"""
    if self.birth_date:
        from frappe.utils import getdate, nowdate
        age = (getdate(nowdate()) - getdate(self.birth_date)).days / 365
        self.age = int(age)
```

## Child DocType Patterns

### Parent-Child Relationship

```python
# Parent: Sales Order
# Child: Sales Order Item

# sales_order_item.py
class SalesOrderItem(Document):
    """Child DocType for Sales Order"""

    def validate(self):
        """Validate item"""
        self.validate_quantity()
        self.calculate_amount()

    def validate_quantity(self):
        """Ensure positive quantity"""
        if self.qty <= 0:
            frappe.throw(_("Quantity must be positive"))

    def calculate_amount(self):
        """Calculate line item amount"""
        self.amount = self.qty * self.rate
```

### Accessing Child Table in Parent

```python
# In SalesOrder controller
def validate(self):
    """Validate sales order"""
    self.validate_items()
    self.calculate_totals()

def validate_items(self):
    """Validate all items"""
    if not self.items:
        frappe.throw(_("Please add at least one item"))

    for item in self.items:
        if item.qty <= 0:
            frappe.throw(_("Row {0}: Quantity must be positive").format(item.idx))

def calculate_totals(self):
    """Calculate order totals"""
    self.total = sum(item.amount for item in self.items)
    self.tax_amount = self.total * 0.1  # 10% tax
    self.grand_total = self.total + self.tax_amount
```

## Permission System

### DocType Permissions

```python
# In customer.json
{
    "permissions": [
        {
            "role": "Sales User",
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 0,
            "submit": 0,
            "cancel": 0,
            "amend": 0
        },
        {
            "role": "Sales Manager",
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1,
            "submit": 1,
            "cancel": 1,
            "amend": 1
        }
    ]
}
```

### User Permissions (Row-Level)

```python
def has_permission(doc, ptype, user):
    """Custom permission check"""
    # Allow users to see only their own customers
    if frappe.session.user == "Administrator":
        return True

    # Check if user is assigned to this customer
    if doc.sales_person == frappe.session.user:
        return True

    return False
```

### Permission Queries

```python
def get_permission_query_conditions(user):
    """Filter records based on user permissions"""
    if user == "Administrator":
        return None

    # Users can see customers from their territory only
    territories = frappe.get_all("User Territory",
        filters={"user": user},
        pluck="territory"
    )

    if territories:
        return f"`tabCustomer`.territory in ({','.join(['%s']*len(territories))})"

    return "1=0"  # No access
```

## Submittable DocTypes

For documents that need approval workflow:

```json
{
    "is_submittable": 1,
    "doctype": "Sales Order"
}
```

```python
class SalesOrder(Document):
    """Submittable DocType"""

    def on_submit(self):
        """Lock document and perform actions"""
        self.status = "Submitted"
        self.create_stock_entry()

    def on_cancel(self):
        """Reverse actions"""
        self.status = "Cancelled"
        self.cancel_stock_entry()

    def before_cancel(self):
        """Validation before cancel"""
        if self.has_invoices():
            frappe.throw(_("Cannot cancel order with invoices"))
```

## Client Script Patterns

### Form Events

```javascript
// customer.js
frappe.ui.form.on('Customer', {
    // Form load
    refresh: function(frm) {
        // Add custom button
        if (!frm.is_new()) {
            frm.add_custom_button(__('View Transactions'), () => {
                frappe.route_options = {'customer': frm.doc.name};
                frappe.set_route('List', 'Sales Invoice');
            });
        }

        // Set field properties
        frm.set_df_property('credit_limit', 'read_only', frm.doc.status === 'Inactive');
    },

    // Field change events
    email: function(frm) {
        if (frm.doc.email) {
            // Validate email
            if (!frappe.utils.validate_email(frm.doc.email)) {
                frappe.msgprint(__('Invalid email format'));
                frm.set_value('email', '');
            }
        }
    },

    customer_type: function(frm) {
        // Auto-set based on type
        if (frm.doc.customer_type === 'Company') {
            frm.set_value('payment_terms', 'Net 30 Days');
        } else {
            frm.set_value('payment_terms', 'Immediate');
        }
    },

    // Before save
    before_save: function(frm) {
        // Client-side validation
        if (!frm.doc.customer_name) {
            frappe.throw(__('Customer Name is required'));
        }
    },

    // After save
    after_save: function(frm) {
        frappe.show_alert(__('Customer saved successfully'), 5);
    }
});

// Child table events
frappe.ui.form.on('Customer Address', {
    // When row is added
    addresses_add: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.is_primary = 0;
    },

    // When field in child changes
    address_type: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.address_type === 'Billing') {
            row.is_primary = 1;
        }
    }
});
```

### Custom Queries

```javascript
frappe.ui.form.on('Sales Order', {
    setup: function(frm) {
        // Filter customer dropdown
        frm.set_query('customer', () => {
            return {
                filters: {
                    'status': 'Active',
                    'customer_type': 'Company'
                }
            };
        });

        // Filter item in child table
        frm.set_query('item', 'items', () => {
            return {
                filters: {
                    'is_sales_item': 1,
                    'has_variants': 0
                }
            };
        });
    }
});
```

## Virtual DocTypes

DocTypes without database table (for reports, settings):

```python
# In doctype.json
{
    "istable": 0,
    "issingle": 1,  # Single DocType (only one record)
    "is_virtual": 1  # No database table
}

# In controller
class DashboardSettings(Document):
    """Virtual DocType for settings"""

    def validate(self):
        """Validation logic"""
        pass

    def db_insert(self):
        """Override insert - store in cache instead"""
        frappe.cache().set_value(
            f"dashboard_settings_{frappe.session.user}",
            self.as_dict()
        )

    def load_from_db(self):
        """Override load - fetch from cache"""
        data = frappe.cache().get_value(
            f"dashboard_settings_{frappe.session.user}"
        )
        if data:
            super().update(data)
```

## Best Practices

**DO:**
- ✅ Use `frappe.throw()` for validation errors
- ✅ Use `_(text)` for translatable strings
- ✅ Validate data in `validate()` method
- ✅ Use `frappe.db.get_value()` for fetching values
- ✅ Add indexes for frequently queried fields
- ✅ Write unit tests for all controllers
- ✅ Document field descriptions
- ✅ Use proper field types (Currency for money, not Float)

**DON'T:**
- ❌ Modify core DocTypes directly (use Custom Fields)
- ❌ Use raw SQL in controllers
- ❌ Put business logic in client scripts
- ❌ Skip validation
- ❌ Use abbreviations in field names
- ❌ Create duplicate DocTypes
- ❌ Hardcode values

## Common Patterns

### 1. State Machine Pattern

```python
class Order(Document):
    """Order with state machine"""

    VALID_TRANSITIONS = {
        'Draft': ['Submitted'],
        'Submitted': ['Confirmed', 'Cancelled'],
        'Confirmed': ['Processing'],
        'Processing': ['Completed', 'Failed'],
        'Completed': [],
        'Failed': [],
        'Cancelled': []
    }

    def validate(self):
        if self.has_value_changed('status'):
            self.validate_status_transition()

    def validate_status_transition(self):
        """Ensure valid state transition"""
        old_status = self.get_db_value('status')
        new_status = self.status

        valid_next = self.VALID_TRANSITIONS.get(old_status, [])
        if new_status not in valid_next:
            frappe.throw(_(
                f"Cannot change status from {old_status} to {new_status}"
            ))
```

### 2. Audit Trail Pattern

```python
class Customer(Document):
    """Customer with audit trail"""

    def on_update(self):
        """Track all changes"""
        if self.has_value_changed('credit_limit'):
            self.log_credit_limit_change()

    def log_credit_limit_change(self):
        """Log credit limit changes"""
        old_value = self.get_db_value('credit_limit')
        new_value = self.credit_limit

        frappe.get_doc({
            'doctype': 'Customer Audit Log',
            'customer': self.name,
            'field': 'credit_limit',
            'old_value': old_value,
            'new_value': new_value,
            'changed_by': frappe.session.user,
            'changed_at': frappe.utils.now()
        }).insert()
```

### 3. Computed Field Pattern

```python
class Invoice(Document):
    """Invoice with computed totals"""

    def validate(self):
        self.calculate_totals()

    def calculate_totals(self):
        """Calculate all totals"""
        # Subtotal
        self.subtotal = sum(item.amount for item in self.items)

        # Tax
        self.tax_amount = self.subtotal * (self.tax_rate / 100)

        # Discount
        if self.discount_type == "Percentage":
            self.discount_amount = self.subtotal * (self.discount_value / 100)
        else:
            self.discount_amount = self.discount_value

        # Grand total
        self.grand_total = self.subtotal + self.tax_amount - self.discount_amount
```

## Testing DocTypes

```python
# test_customer.py
import frappe
import unittest

class TestCustomer(unittest.TestCase):
    """Test Customer DocType"""

    def setUp(self):
        """Setup test data"""
        # Runs before each test
        pass

    def tearDown(self):
        """Cleanup"""
        # Runs after each test
        frappe.db.rollback()

    def test_customer_creation(self):
        """Test creating a customer"""
        customer = frappe.get_doc({
            'doctype': 'Customer',
            'customer_name': 'Test Customer',
            'email': 'test@example.com'
        })
        customer.insert()

        self.assertEqual(customer.customer_name, 'Test Customer')
        self.assertEqual(customer.status, 'Active')

    def test_duplicate_email(self):
        """Test duplicate email validation"""
        # Create first customer
        customer1 = frappe.get_doc({
            'doctype': 'Customer',
            'customer_name': 'Customer 1',
            'email': 'same@example.com'
        }).insert()

        # Try to create second with same email
        customer2 = frappe.get_doc({
            'doctype': 'Customer',
            'customer_name': 'Customer 2',
            'email': 'same@example.com'
        })

        with self.assertRaises(frappe.ValidationError):
            customer2.insert()

    def test_credit_limit(self):
        """Test negative credit limit validation"""
        customer = frappe.get_doc({
            'doctype': 'Customer',
            'customer_name': 'Test',
            'credit_limit': -1000
        })

        with self.assertRaises(frappe.ValidationError):
            customer.insert()
```

## Next Steps

- Learn API patterns → `frappe-api-patterns`
- Master testing → `frappe-testing`
- Implement permissions → `frappe-permissions`
- Create workflows → `frappe-workflows`
- Build reports → `frappe-reports`
