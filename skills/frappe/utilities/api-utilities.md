# Frappe API Utilities

Essential utilities for building REST/RPC APIs with Frappe. Use these for response formatting, error handling, and permission checks.

## Whitelisting & API Definition

### `@frappe.whitelist()`
Decorator to expose Python method as API endpoint.

**Use when:** Creating callable API methods
```python
from frappe import whitelist

@whitelist()
def get_customer_balance(customer):
    """Get outstanding balance for customer

    Args:
        customer (str): Customer ID

    Returns:
        dict: Balance information
    """
    if not frappe.has_permission("Customer", "read", doc=customer):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    balance = frappe.db.get_value("Customer", customer, "outstanding_amount")
    return {"balance": balance or 0.0}

# Call from frontend:
# frappe.call({
#     "method": "myapp.api.get_customer_balance",
#     "args": {"customer": "CUST-001"},
#     "callback": (r) => console.log(r.message)
# })
```

**Parameters:**
- `allow_guest=True` - Allow unauthenticated access (SECURITY: requires extra validation)
- `methods=["GET", "POST"]` - HTTP methods allowed

---

### `@frappe.whitelist(allow_guest=True)` - For Public APIs

**CRITICAL: NEVER skip validation**
```python
from frappe import whitelist, rate_limit

@whitelist(allow_guest=True)
@rate_limit(limit=10, seconds=60)  # Prevent abuse
def search_public_customers(query):
    """Search customers by name (public endpoint)

    Args:
        query (str): Search term (min 3 chars)

    Returns:
        list: Matching customers
    """
    # MANDATORY: Validate input
    if not query or len(query) < 3:
        frappe.throw(_("Search term must be at least 3 characters"))

    # MANDATORY: Permission check
    if not frappe.has_permission("Customer", "read"):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    # MANDATORY: Sanitize input (prevent injection)
    query = frappe.db.escape(query)

    # Return only public fields
    return frappe.get_all("Customer",
        filters={"customer_name": ["like", f"%{query}%"]},
        fields=["name", "customer_name"],  # NOT: credit_limit, internal_notes
        limit=20  # Limit results
    )
```

---

## Permission Checking

### `frappe.has_permission(doctype, ptype="read", doc=None)`
Check user permission before operation.

**Use when:** Authorizing API calls
```python
from frappe import has_permission

# Check document permission
if not has_permission("Customer", "read", doc=customer_name):
    frappe.throw(_("Not permitted"), frappe.PermissionError)

# Check DocType permission
if not has_permission("Sales Order", "create"):
    frappe.throw(_("Cannot create orders"), frappe.PermissionError)

# Permission types: read, write, delete, create, submit, amend, print
```

---

## Request/Response Handling

### `frappe.request`
Access HTTP request data.

**Use when:** Reading request parameters, headers
```python
from frappe import request, whitelist

@whitelist()
def process_webhook():
    """Process incoming webhook"""

    # Get request body
    data = request.json  # Or request.form for form data

    # Get headers
    signature = request.headers.get("X-Signature")

    # Get URL parameters
    action = frappe.get_arg("action")

    return {"status": "received"}
```

---

### Response Format - Standard Envelope

**Always return consistent structure:**
```python
from frappe import whitelist

@whitelist()
def create_order(customer, items):
    """Create a new order

    Returns:
        dict: Response with order info
    """
    try:
        # Validate input
        if not customer or not items:
            frappe.throw(_("Customer and items are required"))

        # Create order
        order = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": customer,
            "items": items
        }).insert()

        # GOOD: Return data with structure
        return {
            "success": True,
            "message": _("Order created successfully"),
            "data": {
                "order_id": order.name,
                "customer": order.customer,
                "total": order.total
            }
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Order Creation")
        return {
            "success": False,
            "message": _("Failed to create order"),
            "data": None
        }
```

---

## Error Handling

### `frappe.throw(msg, exc_type=None, title=None)`
Raise error that converts to JSON response for API calls.

**Use when:** Returning errors from API
```python
from frappe import throw, _

# Validation error
if not customer_name:
    throw(_("Customer name is required"), frappe.ValidationError)

# Permission error
if not frappe.has_permission("Customer", "delete"):
    throw(_("Not permitted"), frappe.PermissionError)

# Generic error
throw(_("Operation failed"))

# Custom error message with title
throw(_("Invalid customer selected"), title=_("Selection Error"))
```

**Error Types:**
- `frappe.ValidationError` - Validation failed
- `frappe.PermissionError` - Access denied
- `frappe.DoesNotExistError` - Record not found
- `frappe.DuplicateEntryError` - Duplicate record
- `frappe.MandatoryError` - Required field missing

---

### `frappe.log_error(message, title=None)`
Log error for debugging without throwing.

**Use when:** Recording errors that don't stop execution
```python
from frappe import log_error

try:
    external_api_call()
except Exception as e:
    log_error(frappe.get_traceback(), "External API Error")
    # Continue or handle gracefully
```

---

## Rate Limiting

### `@frappe.rate_limit(limit=10, seconds=60)`
Limit API calls per user.

**Use when:** Protecting APIs from abuse
```python
from frappe import whitelist, rate_limit

@whitelist(allow_guest=True)
@rate_limit(limit=5, seconds=60)  # 5 calls per minute
def login(username, password):
    # Prevent brute force
    pass

@whitelist()
@rate_limit(limit=100, seconds=60)  # 100 calls per minute for authenticated
def search(query):
    # Reasonable limit
    pass
```

---

## Request Arguments

### `frappe.get_arg(key, default=None)`
Get URL or form parameter safely.

**Use when:** Reading request parameters
```python
from frappe import get_arg, whitelist

@whitelist()
def search():
    query = get_arg("q", "")  # URL: /api/method/myapp.search?q=test
    limit = get_arg("limit", 20)  # Default 20

    return frappe.get_all("Item",
        filters={"item_name": ["like", f"%{query}%"]},
        limit_page_length=limit
    )
```

---

## Request Headers

### Get/Set Headers

**Read headers:**
```python
from frappe import request, whitelist

@whitelist(allow_guest=True)
def check_auth():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    api_key = request.headers.get("X-API-Key")

    if not token and not api_key:
        frappe.throw(_("Missing authentication"), frappe.AuthenticationError)
```

**Set response headers:**
```python
from frappe import response

def custom_endpoint():
    frappe.response['headers'] = {
        "X-Custom-Header": "value",
        "Cache-Control": "no-cache"
    }
    return {"data": "value"}
```

---

## JSON Response Handling

### Return JSON automatically

Frappe automatically converts returned dicts to JSON:
```python
@whitelist()
def get_data():
    # This is automatically JSON encoded
    return {
        "customers": [...],
        "total": 100
    }

# Frontend receives:
# {"message": {"customers": [...], "total": 100}, "exc": null}
```

---

## Pagination Pattern

**Implement pagination in list endpoints:**
```python
@whitelist()
def get_customers():
    page = cint(frappe.get_arg("page") or 1)
    page_size = cint(frappe.get_arg("limit") or 20)

    offset = (page - 1) * page_size

    total = frappe.db.count("Customer")

    customers = frappe.get_all("Customer",
        fields=["name", "customer_name", "email"],
        order_by="creation desc",
        limit_page_length=page_size,
        offset=offset
    )

    return {
        "data": customers,
        "total": total,
        "page": page,
        "page_size": page_size
    }
```

---

## Common API Patterns

### Pattern: Fetch Single
```python
@whitelist()
def get_customer(name):
    if not frappe.has_permission("Customer", "read", doc=name):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    return frappe.get_doc("Customer", name).as_dict()
```

### Pattern: Fetch List with Filter
```python
@whitelist()
def list_active_customers(territory=None):
    filters = {"status": "Active"}
    if territory:
        filters["territory"] = territory

    return frappe.get_all("Customer", filters=filters)
```

### Pattern: Create
```python
@whitelist()
def create_customer(customer_name, email):
    if not frappe.has_permission("Customer", "create"):
        frappe.throw(_("Cannot create"), frappe.PermissionError)

    customer = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": customer_name,
        "email": email
    }).insert()

    return {"id": customer.name}
```

### Pattern: Update
```python
@whitelist()
def update_customer(name, **kwargs):
    if not frappe.has_permission("Customer", "write", doc=name):
        frappe.throw(_("Cannot update"), frappe.PermissionError)

    customer = frappe.get_doc("Customer", name)
    customer.update(kwargs)
    customer.save()

    return customer.as_dict()
```

---

## Best Practices

**ALWAYS:**
- ✅ Check permissions in every API method
- ✅ Validate and sanitize all inputs
- ✅ Return consistent response format
- ✅ Use `frappe.throw()` for errors (converts to JSON)
- ✅ Rate limit public APIs
- ✅ Log errors with context
- ✅ Use parameterized queries
- ✅ Document expected parameters and return format

**NEVER:**
- ❌ Expose internal errors to frontend: `throw(str(e))` ✗
- ❌ Skip permission checks
- ❌ Use raw SQL in APIs
- ❌ Return password fields or sensitive data
- ❌ Allow guest access without validation
- ❌ Hardcode response structures

---

## JavaScript Frontend Calls

**Call API from frontend:**
```javascript
// Simple call
frappe.call({
    method: "myapp.api.get_customer_balance",
    args: {
        customer: "CUST-001"
    },
    callback: (r) => {
        if (!r.exc) {
            console.log("Balance:", r.message);
        }
    }
});

// With error handling
frappe.call({
    method: "myapp.api.create_order",
    args: {...},
    callback: (r) => {
        if (r.message.success) {
            frappe.msgprint("Order created");
        }
    },
    error: (r) => {
        frappe.msgprint("Error creating order");
    }
});
```

---

## Related

- **Validation Utilities** - Validate API inputs
- **Database Utilities** - Query data in APIs
- **Formatting Utilities** - Format data for API responses
- **Frappe Security Rules** - Permission and injection prevention
- **Frappe Conventions** - API naming patterns

## When to Use This Skill

Use this skill when:
- Building REST/RPC API endpoints
- Implementing webhooks or integrations
- Handling API errors and responses
- Designing pagination and filtering
- Implementing rate limiting
- Writing API tests