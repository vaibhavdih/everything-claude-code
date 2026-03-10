---
name: frappe-permissions
description: Frappe permission system - role-based access, user permissions, permission queries, and security patterns.
origin: ECC
---

# Frappe Permissions System

Comprehensive guide to Frappe's role-based permission system.

## When to Activate

- Configuring DocType permissions
- Implementing row-level security
- Creating custom permission logic
- Designing multi-tenant applications
- Securing API endpoints
- Building approval workflows

## Permission Levels

Frappe has three permission levels:

1. **Role Permissions** - DocType-level (Can read/write Customer DocType)
2. **User Permissions** - Row-level (Can only see specific customers)
3. **Custom Permissions** - Custom logic in code

## Role Permissions

### Configuring in DocType

```json
// In customer.json
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
            "amend": 0,
            "report": 1,
            "export": 1,
            "import": 0,
            "share": 1,
            "print": 1,
            "email": 1
        },
        {
            "role": "Sales Manager",
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1,
            "submit": 1,
            "cancel": 1,
            "amend": 1,
            "report": 1,
            "export": 1,
            "import": 1,
            "share": 1,
            "print": 1,
            "email": 1
        }
    ]
}
```

### Permission Types

| Permission | Description |
|------------|-------------|
| **read** | View documents |
| **write** | Edit existing documents |
| **create** | Create new documents |
| **delete** | Delete documents |
| **submit** | Submit documents (if submittable) |
| **cancel** | Cancel submitted documents |
| **amend** | Amend cancelled documents |
| **report** | Access reports |
| **export** | Export data |
| **import** | Import data |
| **share** | Share documents with others |
| **print** | Print documents |
| **email** | Send emails |

### Permission Levels

```json
{
    "permissions": [
        {
            "role": "Sales Manager",
            "permlevel": 0,  // Can edit all fields
            "read": 1,
            "write": 1
        },
        {
            "role": "Sales User",
            "permlevel": 1,  // Can only edit permlevel 0 fields
            "read": 1,
            "write": 0
        }
    ]
}
```

### Field-Level Permissions

```json
// In DocType field definition
{
    "fieldname": "discount_amount",
    "fieldtype": "Currency",
    "label": "Discount Amount",
    "permlevel": 1  // Only roles with permlevel 1 can edit
}
```

## User Permissions

### Creating User Permissions

```python
# Allow user to access only specific customers
frappe.get_doc({
    "doctype": "User Permission",
    "user": "sales@example.com",
    "allow": "Customer",
    "for_value": "CUST-001",
    "applicable_for": "Sales Order"  // Apply to Sales Order
}).insert()
```

### Managing User Permissions

```bash
# Via UI: Setup > Permissions > User Permissions

# Via code
def set_user_territory_permissions(user, territory):
    """Set territory-based permissions for user"""

    # Remove existing permissions
    frappe.db.delete("User Permission", {
        "user": user,
        "allow": "Territory"
    })

    # Add new permission
    frappe.get_doc({
        "doctype": "User Permission",
        "user": user,
        "allow": "Territory",
        "for_value": territory
    }).insert()
```

## Custom Permission Logic

### has_permission Method

```python
# In customer.py
def has_permission(doc, ptype="read", user=None):
    """Custom permission check

    Args:
        doc: Document being accessed
        ptype: Permission type (read, write, delete, etc.)
        user: User requesting access

    Returns:
        bool: True if allowed, False otherwise
    """
    if not user:
        user = frappe.session.user

    # Administrator has all permissions
    if user == "Administrator":
        return True

    # Sales Manager can access all
    if "Sales Manager" in frappe.get_roles(user):
        return True

    # Users can access their own assigned customers
    if doc.sales_person == user:
        return True

    # Check territory permissions
    user_territories = frappe.get_all("User Permission",
        filters={
            "user": user,
            "allow": "Territory"
        },
        pluck="for_value"
    )

    if doc.territory in user_territories:
        return True

    return False
```

### get_permission_query_conditions

```python
def get_permission_query_conditions(user):
    """Filter list view based on permissions

    Args:
        user: User requesting list

    Returns:
        str: SQL WHERE clause condition
    """
    if not user:
        user = frappe.session.user

    if user == "Administrator":
        return None  # No filter

    if "Sales Manager" in frappe.get_roles(user):
        return None  # Can see all

    # Users see only their assigned customers
    return f"`tabCustomer`.sales_person = {frappe.db.escape(user)}"
```

### has_website_permission

```python
def has_website_permission(doc, ptype="read", user=None):
    """Permission check for website/portal views

    Args:
        doc: Document being accessed
        ptype: Permission type
        user: User requesting access

    Returns:
        bool: True if allowed
    """
    if not user:
        user = frappe.session.user

    # Guest users can't access
    if user == "Guest":
        return False

    # Check if user is the customer
    customer = frappe.db.get_value("Customer", {"email": user})

    if customer == doc.name:
        return True

    return False
```

## API Permission Patterns

### Whitelisted Methods

```python
@frappe.whitelist()
def get_customer_orders(customer):
    """Get orders for customer with permission check"""

    # Check if user has read permission on Customer
    if not frappe.has_permission("Customer", "read", doc=customer):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    # Check if user has read permission on Sales Order
    if not frappe.has_permission("Sales Order", "read"):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    orders = frappe.get_all("Sales Order",
        filters={"customer": customer},
        fields=["name", "grand_total", "status"]
    )

    return orders
```

### Permission-Aware Queries

```python
@frappe.whitelist()
def search_customers(query):
    """Search customers respecting user permissions"""

    # frappe.get_all respects permissions by default
    customers = frappe.get_all("Customer",
        filters={
            "customer_name": ["like", f"%{query}%"]
        },
        fields=["name", "customer_name", "email"],
        ignore_permissions=False  # Explicit (default is False)
    )

    return customers
```

### Ignoring Permissions (Admin Operations)

```python
def admin_sync_operation():
    """Admin operation that needs to bypass permissions"""

    # Save current user
    current_user = frappe.session.user

    try:
        # Set to Administrator
        frappe.set_user("Administrator")

        # Perform operations
        customers = frappe.get_all("Customer",
            ignore_permissions=True
        )

        # Process all customers...

    finally:
        # Restore original user
        frappe.set_user(current_user)
```

## Share Permissions

### Sharing Documents

```python
# Share document with user
frappe.share.add("Customer", "CUST-001", user="user@example.com",
    read=1, write=1, share=0)

# Remove share
frappe.share.remove("Customer", "CUST-001", user="user@example.com")

# Get shared users
shared_users = frappe.share.get_users("Customer", "CUST-001")
```

### Custom Share Logic

```python
def share_customer_with_team(customer, team_members):
    """Share customer with team members"""

    for user in team_members:
        # Check if already shared
        if not frappe.db.exists("DocShare", {
            "share_doctype": "Customer",
            "share_name": customer,
            "user": user
        }):
            frappe.share.add("Customer", customer, user=user,
                read=1, write=1)
```

## Permission Inheritance

### Child DocTypes

```python
# Child tables inherit parent permissions
# No separate permission configuration needed

# In sales_order_item.py (child table)
class SalesOrderItem(Document):
    def validate(self):
        # Can access parent
        sales_order = self.parent_doc

        # Parent permissions apply
        if not frappe.has_permission("Sales Order", "write", doc=sales_order):
            frappe.throw(_("Not permitted"))
```

## Role Management

### Assigning Roles

```python
# Add role to user
frappe.get_doc("User", "user@example.com").add_roles("Sales Manager")

# Remove role
frappe.get_doc("User", "user@example.com").remove_roles("Sales User")

# Check if user has role
if "Sales Manager" in frappe.get_roles("user@example.com"):
    # User has role
    pass
```

### Custom Roles

```python
# Create custom role
role = frappe.get_doc({
    "doctype": "Role",
    "role_name": "Territory Manager",
    "desk_access": 1
}).insert()

# Assign permissions to role
# Done via DocType Permission UI or JSON
```

## Permission Debugging

### Check Permissions

```python
# In console
>>> frappe.has_permission("Customer", "read", user="user@example.com")
True

>>> frappe.has_permission("Customer", "delete", user="user@example.com")
False

# Check with specific document
>>> doc = frappe.get_doc("Customer", "CUST-001")
>>> frappe.has_permission("Customer", "write", doc=doc, user="user@example.com")
True
```

### Get User Roles

```python
>>> frappe.get_roles("user@example.com")
['Sales User', 'Employee', 'All']

>>> frappe.get_roles()  # Current user
['Administrator', 'System Manager', 'All']
```

### Get User Permissions

```python
>>> frappe.get_all("User Permission",
...     filters={"user": "user@example.com"},
...     fields=["allow", "for_value"]
... )
[{'allow': 'Territory', 'for_value': 'North'}]
```

## Security Best Practices

**DO:**
- ✅ Always check permissions in whitelisted methods
- ✅ Use `frappe.has_permission()` explicitly
- ✅ Implement row-level security with User Permissions
- ✅ Test permissions with different user roles
- ✅ Use permission queries for list filtering
- ✅ Document permission requirements
- ✅ Use `frappe.only_for()` decorator for role-specific methods

**DON'T:**
- ❌ Skip permission checks in APIs
- ❌ Use `ignore_permissions=True` without justification
- ❌ Hardcode user checks (use roles instead)
- ❌ Expose sensitive data without permission checks
- ❌ Allow guest access without validation
- ❌ Bypass permissions in production code

## Common Patterns

### Hierarchical Permissions

```python
def has_permission(doc, ptype, user):
    """Check hierarchical territory permissions"""

    user_territory = frappe.db.get_value("Employee", {"user_id": user}, "territory")

    if not user_territory:
        return False

    # Get all child territories
    territories = get_child_territories(user_territory)

    return doc.territory in territories

def get_child_territories(parent):
    """Get all descendant territories"""
    return frappe.get_all("Territory",
        filters={"parent_territory": parent},
        pluck="name"
    )
```

### Time-Based Permissions

```python
def has_permission(doc, ptype, user):
    """Allow editing only during business hours"""

    from frappe.utils import now_datetime, get_datetime

    now = now_datetime()
    hour = now.hour

    # Allow managers anytime
    if "Manager" in frappe.get_roles(user):
        return True

    # Allow others during business hours (9 AM - 6 PM)
    if 9 <= hour < 18:
        return True

    return False
```

### Approval Workflow Permissions

```python
def has_permission(doc, ptype, user):
    """Permission based on approval status"""

    # Anyone can read
    if ptype == "read":
        return True

    # Only creator can edit draft
    if doc.status == "Draft":
        return doc.owner == user

    # Only approvers can approve
    if ptype == "submit":
        return "Approver" in frappe.get_roles(user)

    # Can't edit approved documents
    if doc.status == "Approved":
        return False

    return True
```

## Next Steps

- Apply permissions to APIs → `frappe-api-patterns`
- Implement workflows → `frappe-workflows`
- Test permissions → `frappe-testing`
- Deploy securely → `frappe-deployment`
