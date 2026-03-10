---
name: frappe-api-patterns
description: REST and RPC API patterns for Frappe - whitelisted methods, authentication, permissions, error handling, and best practices.
origin: ECC
---

# Frappe API Development Patterns

Guide to building secure, performant APIs in Frappe framework.

## When to Activate

- Creating REST/RPC API endpoints
- Building integrations with external systems
- Developing mobile app backends
- Creating webhooks
- Exposing business logic via API

## API Types in Frappe

### 1. Whitelisted Methods (RPC)

Most common API pattern in Frappe:

```python
# In api.py
import frappe
from frappe import _

@frappe.whitelist()
def get_customer_balance(customer):
    """Get customer outstanding balance

    Args:
        customer (str): Customer ID

    Returns:
        dict: Balance information
    """
    # Permission check
    if not frappe.has_permission("Customer", "read"):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    balance = frappe.db.get_value("Customer", customer, "outstanding_amount")

    return {
        "customer": customer,
        "balance": balance or 0.0,
        "currency": frappe.defaults.get_global_default("currency")
    }
```

**Endpoint**: `/api/method/myapp.api.get_customer_balance`

**Usage**:
```bash
curl -X POST https://site.com/api/method/myapp.api.get_customer_balance \
  -H "Authorization: token xxx:yyy" \
  -d '{"customer": "CUST-001"}'
```

### 2. Resource APIs (REST)

Standard CRUD operations on DocTypes:

```bash
# GET - List documents
GET /api/resource/Customer?fields=["name","customer_name"]&limit=10

# GET - Single document
GET /api/resource/Customer/CUST-001

# POST - Create document
POST /api/resource/Customer
{
    "customer_name": "John Doe",
    "email": "john@example.com"
}

# PUT - Update document
PUT /api/resource/Customer/CUST-001
{
    "customer_name": "John Updated"
}

# DELETE - Delete document
DELETE /api/resource/Customer/CUST-001
```

### 3. DocType Method APIs

Methods defined in DocType controllers:

```python
# In customer.py controller
class Customer(Document):

    @frappe.whitelist()
    def send_welcome_email(self):
        """Send welcome email to customer"""
        if not self.email:
            frappe.throw(_("Email not set"))

        frappe.sendmail(
            recipients=[self.email],
            subject=_("Welcome to our platform"),
            message=_("Thank you for registering!")
        )

        return {"status": "sent"}
```

**Endpoint**: `/api/method/Customer/CUST-001/send_welcome_email`

## Authentication

### 1. API Key/Secret (Recommended)

```python
# Generate API key for user
api_key = frappe.generate_hash(length=15)
api_secret = frappe.generate_hash(length=15)

frappe.db.set_value("User", user, "api_key", api_key)
frappe.db.set_value("User", user, "api_secret", api_secret)
```

**Usage**:
```bash
curl -H "Authorization: token api_key:api_secret" \
  https://site.com/api/method/endpoint
```

### 2. OAuth 2.0

Enable in site_config.json:
```json
{
    "oauth_provider": "frappe",
    "oauth_client_id": "xxx",
    "oauth_client_secret": "yyy"
}
```

### 3. JWT Tokens

```python
# Generate JWT token
import jwt
from frappe.utils import get_datetime

def generate_jwt_token(user):
    """Generate JWT token for user"""
    secret = frappe.conf.get("jwt_secret_key")

    payload = {
        "user": user,
        "exp": get_datetime().timestamp() + 3600  # 1 hour
    }

    token = jwt.encode(payload, secret, algorithm="HS256")
    return token

# Validate JWT token
@frappe.whitelist(allow_guest=True)
def validate_token():
    """Validate JWT token from header"""
    token = frappe.get_request_header("Authorization", "").replace("Bearer ", "")

    try:
        secret = frappe.conf.get("jwt_secret_key")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        frappe.set_user(payload["user"])
        return {"valid": True, "user": payload["user"]}
    except jwt.ExpiredSignatureError:
        frappe.throw(_("Token expired"), frappe.AuthenticationError)
    except jwt.InvalidTokenError:
        frappe.throw(_("Invalid token"), frappe.AuthenticationError)
```

## Permission Patterns

### 1. Explicit Permission Checks

```python
@frappe.whitelist()
def delete_customer(customer):
    """Delete customer with permission check"""

    # Check if user has delete permission
    if not frappe.has_permission("Customer", "delete", doc=customer):
        frappe.throw(_("Not permitted to delete"), frappe.PermissionError)

    # Check if customer has transactions
    if frappe.db.exists("Sales Order", {"customer": customer}):
        frappe.throw(_("Cannot delete customer with orders"))

    frappe.delete_doc("Customer", customer)

    return {"status": "deleted"}
```

### 2. Role-Based Access

```python
@frappe.whitelist()
def approve_order(order_id):
    """Approve order - requires manager role"""

    if not "Sales Manager" in frappe.get_roles():
        frappe.throw(_("Only managers can approve"), frappe.PermissionError)

    order = frappe.get_doc("Sales Order", order_id)
    order.status = "Approved"
    order.approved_by = frappe.session.user
    order.save()

    return {"status": "approved"}
```

### 3. Owner-Based Access

```python
@frappe.whitelist()
def update_profile(data):
    """Update user profile - owner only"""

    user = frappe.session.user

    # Can only update own profile
    if data.get("name") != user:
        frappe.throw(_("Can only update your own profile"), frappe.PermissionError)

    doc = frappe.get_doc("User", user)
    doc.update(data)
    doc.save()

    return doc.as_dict()
```

## Request/Response Patterns

### 1. Request Validation

```python
@frappe.whitelist()
def create_order(customer, items):
    """Create sales order with validation

    Args:
        customer (str): Customer ID
        items (list): List of items with qty and rate
    """

    # Parse JSON if string
    if isinstance(items, str):
        import json
        items = json.loads(items)

    # Validate customer
    if not frappe.db.exists("Customer", customer):
        frappe.throw(_("Invalid customer"))

    # Validate items
    if not items or not isinstance(items, list):
        frappe.throw(_("Items must be a non-empty list"))

    for item in items:
        if not item.get("item_code"):
            frappe.throw(_("Item code is required"))
        if not item.get("qty") or item["qty"] <= 0:
            frappe.throw(_("Invalid quantity for {0}").format(item.get("item_code")))

    # Create order
    order = frappe.get_doc({
        "doctype": "Sales Order",
        "customer": customer,
        "items": items
    })
    order.insert()

    return order.as_dict()
```

### 2. Error Handling

```python
@frappe.whitelist()
def process_payment(order_id, amount):
    """Process payment with proper error handling"""

    try:
        # Validate order
        order = frappe.get_doc("Sales Order", order_id)

        if order.grand_total != amount:
            frappe.throw(_("Amount mismatch"))

        # Process payment (external API)
        result = external_payment_gateway.charge(amount)

        if not result.success:
            frappe.throw(_("Payment failed: {0}").format(result.error))

        # Update order
        order.payment_status = "Paid"
        order.payment_ref = result.transaction_id
        order.save()

        frappe.db.commit()

        return {
            "success": True,
            "transaction_id": result.transaction_id
        }

    except frappe.DoesNotExistError:
        frappe.throw(_("Order not found"), frappe.DoesNotExistError)
    except frappe.ValidationError as e:
        frappe.throw(str(e), frappe.ValidationError)
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Payment Processing Error")
        frappe.throw(_("Payment processing failed"))
```

### 3. Response Formatting

```python
@frappe.whitelist()
def get_dashboard_data():
    """Get dashboard data with proper structure"""

    try:
        data = {
            "success": True,
            "data": {
                "total_customers": frappe.db.count("Customer"),
                "active_orders": frappe.db.count("Sales Order", {"status": "Active"}),
                "revenue": get_total_revenue(),
                "top_customers": get_top_customers(limit=5)
            },
            "timestamp": frappe.utils.now()
        }

        return data

    except Exception as e:
        frappe.log_error(frappe.get_traceback())
        return {
            "success": False,
            "error": str(e),
            "timestamp": frappe.utils.now()
        }
```

## Rate Limiting

```python
from frappe.rate_limiter import rate_limit

@frappe.whitelist(allow_guest=True)
@rate_limit(limit=10, seconds=60)  # 10 requests per minute
def public_api():
    """Public API with rate limiting"""
    return {"message": "Success"}
```

## Pagination

```python
@frappe.whitelist()
def get_customers(page=1, page_size=20, filters=None):
    """Get customers with pagination

    Args:
        page (int): Page number (1-indexed)
        page_size (int): Results per page
        filters (dict): Filter conditions
    """

    # Parse filters
    if isinstance(filters, str):
        import json
        filters = json.loads(filters)

    # Calculate offset
    start = (int(page) - 1) * int(page_size)

    # Get data
    customers = frappe.get_all("Customer",
        filters=filters or {},
        fields=["name", "customer_name", "email", "status"],
        start=start,
        page_length=page_size,
        order_by="creation desc"
    )

    # Get total count
    total = frappe.db.count("Customer", filters=filters or {})

    return {
        "data": customers,
        "pagination": {
            "page": int(page),
            "page_size": int(page_size),
            "total": total,
            "pages": (total + int(page_size) - 1) // int(page_size)
        }
    }
```

## File Upload/Download

### Upload

```python
@frappe.whitelist()
def upload_document():
    """Upload file and attach to document"""

    # Get uploaded file
    files = frappe.request.files
    file = files.get("file")

    if not file:
        frappe.throw(_("No file uploaded"))

    # Save file
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": file.filename,
        "attached_to_doctype": "Customer",
        "attached_to_name": frappe.form_dict.customer,
        "content": file.stream.read()
    })
    file_doc.save()

    return {
        "file_url": file_doc.file_url,
        "file_name": file_doc.file_name
    }
```

### Download

```python
@frappe.whitelist()
def download_report(report_name):
    """Download report as Excel"""

    # Generate report
    data = generate_report_data(report_name)

    # Create Excel file
    from frappe.utils.xlsxutils import make_xlsx
    xlsx_file = make_xlsx(data, "Report")

    # Return file
    frappe.response.filename = f"{report_name}.xlsx"
    frappe.response.filecontent = xlsx_file.getvalue()
    frappe.response.type = "download"
```

## Webhooks

### Outgoing Webhooks

```python
# In hooks.py
doc_events = {
    "Sales Order": {
        "on_submit": "myapp.webhooks.notify_order_submitted"
    }
}

# In webhooks.py
def notify_order_submitted(doc, method):
    """Send webhook when order is submitted"""

    import requests

    webhook_url = frappe.db.get_single_value("Webhook Settings", "order_webhook_url")

    if not webhook_url:
        return

    payload = {
        "event": "order.submitted",
        "order_id": doc.name,
        "customer": doc.customer,
        "total": doc.grand_total,
        "timestamp": frappe.utils.now()
    }

    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
    except Exception as e:
        frappe.log_error(f"Webhook failed: {str(e)}")
```

### Incoming Webhooks

```python
@frappe.whitelist(allow_guest=True)
def handle_payment_webhook():
    """Handle payment gateway webhook"""

    # Verify webhook signature
    signature = frappe.get_request_header("X-Signature")
    if not verify_signature(signature, frappe.request.data):
        frappe.throw(_("Invalid signature"), frappe.AuthenticationError)

    # Parse payload
    import json
    data = json.loads(frappe.request.data)

    # Process based on event
    if data["event"] == "payment.success":
        update_order_payment_status(data["order_id"], "Paid")
    elif data["event"] == "payment.failed":
        update_order_payment_status(data["order_id"], "Failed")

    return {"status": "received"}
```

## Best Practices

**DO:**
- ✅ Always check permissions explicitly
- ✅ Validate all input parameters
- ✅ Use `frappe.throw()` for errors
- ✅ Log errors with `frappe.log_error()`
- ✅ Return consistent response structures
- ✅ Implement rate limiting for public APIs
- ✅ Use pagination for large datasets
- ✅ Document API parameters and returns
- ✅ Version your APIs (`/api/v1/`, `/api/v2/`)

**DON'T:**
- ❌ Skip permission checks
- ❌ Trust user input without validation
- ❌ Expose sensitive data
- ❌ Use `allow_guest=True` without caution
- ❌ Return database errors to users
- ❌ Perform long operations synchronously
- ❌ Hardcode credentials or secrets
- ❌ Ignore rate limiting

## API Documentation

Use docstrings for auto-generated API docs:

```python
@frappe.whitelist()
def create_customer(customer_name, email, phone=None):
    """Create a new customer

    Creates a customer record with the provided details.

    Args:
        customer_name (str): Full name of the customer
        email (str): Email address (must be unique)
        phone (str, optional): Phone number

    Returns:
        dict: Created customer document with fields:
            - name (str): Customer ID
            - customer_name (str): Customer name
            - email (str): Email address
            - status (str): Customer status (default: Active)

    Raises:
        frappe.ValidationError: If email already exists
        frappe.PermissionError: If user lacks create permission

    Example:
        >>> create_customer("John Doe", "john@example.com", "+1234567890")
        {
            "name": "CUST-00001",
            "customer_name": "John Doe",
            "email": "john@example.com",
            "status": "Active"
        }
    """
    # Implementation
    pass
```

## Testing APIs

```python
# In test_api.py
import frappe
import unittest
from frappe.test_runner import make_test_records

class TestCustomerAPI(unittest.TestCase):

    def setUp(self):
        """Setup test data"""
        self.customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Test Customer",
            "email": "test@example.com"
        }).insert()

    def tearDown(self):
        """Cleanup"""
        frappe.db.rollback()

    def test_get_customer_balance(self):
        """Test getting customer balance"""
        from myapp.api import get_customer_balance

        result = get_customer_balance(self.customer.name)

        self.assertIn("balance", result)
        self.assertEqual(result["customer"], self.customer.name)

    def test_permission_check(self):
        """Test API permission enforcement"""
        from myapp.api import delete_customer

        # Set user without delete permission
        frappe.set_user("test@example.com")

        with self.assertRaises(frappe.PermissionError):
            delete_customer(self.customer.name)
```

## Next Steps

- Implement testing → `frappe-testing`
- Add permissions → `frappe-permissions`
- Optimize performance → `frappe-performance`
- Deploy securely → `frappe-deployment`
