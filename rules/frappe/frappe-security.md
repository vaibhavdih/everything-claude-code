# Frappe Security Rules

CRITICAL: These security rules are MANDATORY for all Frappe applications.

## SQL Injection Prevention

### ALWAYS Use Parameterized Queries

```python
# ✅ GOOD: Parameterized query (safe)
customers = frappe.db.sql("""
    SELECT name, customer_name
    FROM `tabCustomer`
    WHERE status = %(status)s
    AND territory = %(territory)s
""", {"status": status, "territory": territory}, as_dict=True)

# ✅ GOOD: Use frappe.db methods (automatically safe)
customers = frappe.get_all("Customer",
    filters={"status": status, "territory": territory},
    fields=["name", "customer_name"]
)

# ❌ BAD: String formatting (SQL injection vulnerability)
customers = frappe.db.sql(f"SELECT * FROM `tabCustomer` WHERE status = '{status}'")

# ❌ BAD: String concatenation
query = "SELECT * FROM `tabCustomer` WHERE status = '" + status + "'"
customers = frappe.db.sql(query)
```

### MANDATORY: Validate All User Input

```python
@frappe.whitelist()
def get_filtered_customers(filters):
    # ✅ GOOD: Validate input
    if isinstance(filters, str):
        import json
        filters = json.loads(filters)

    # Validate filter keys
    allowed_filters = ["status", "territory", "customer_group"]
    for key in filters.keys():
        if key not in allowed_filters:
            frappe.throw(f"Invalid filter: {key}")

    customers = frappe.get_all("Customer", filters=filters)
    return customers
```

## Permission Checks

### MANDATORY: Check Permissions in All Whitelisted Methods

```python
# ✅ GOOD: Permission check before operation
@frappe.whitelist()
def delete_customer(customer):
    # Check permission
    if not frappe.has_permission("Customer", "delete", doc=customer):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    frappe.delete_doc("Customer", customer)
    return {"status": "deleted"}

# ❌ BAD: No permission check
@frappe.whitelist()
def delete_customer(customer):
    frappe.delete_doc("Customer", customer)  # SECURITY RISK!
    return {"status": "deleted"}
```

### NEVER Use allow_guest Without Validation

```python
# ✅ GOOD: Guest with validation and rate limiting
from frappe.rate_limiter import rate_limit

@frappe.whitelist(allow_guest=True)
@rate_limit(limit=10, seconds=60)
def public_search(query):
    # Validate input
    if not query or len(query) < 3:
        frappe.throw("Invalid query")

    # Sanitize query
    query = frappe.db.escape(query)

    # Return limited, non-sensitive data
    results = frappe.get_all("Customer",
        filters={"customer_name": ["like", f"%{query}%"]},
        fields=["name", "customer_name"],  # Public fields only
        limit=10
    )

    return results

# ❌ BAD: Guest without validation
@frappe.whitelist(allow_guest=True)
def public_search(query):
    # No validation, no rate limiting, exposes all fields
    return frappe.get_all("Customer",
        filters={"customer_name": ["like", f"%{query}%"]}
    )
```

## XSS Prevention

### ALWAYS Escape User Input in HTML

```python
# ✅ GOOD: Frappe automatically escapes in Jinja
# In template.html
<div>{{ customer_name }}</div>  <!-- Auto-escaped -->

# ✅ GOOD: Explicit escaping in Python
from frappe.utils import cstr
safe_text = frappe.utils.html_to_text(user_input)

# ❌ BAD: Rendering raw HTML from user input
<div>{{ customer_note | safe }}</div>  <!-- DANGEROUS if user_note is user input -->
```

### Client-Side Validation is Not Security

```javascript
// ❌ BAD: Relying only on client-side validation
frappe.ui.form.on('Customer', {
    validate: function(frm) {
        if (!frm.doc.email) {
            frappe.throw('Email is required');  // Can be bypassed!
        }
    }
});
```

```python
# ✅ GOOD: Server-side validation (mandatory)
class Customer(Document):
    def validate(self):
        if not self.email:
            frappe.throw(_("Email is required"))  # Cannot be bypassed
```

## Authentication & Session Security

### MANDATORY: Validate API Keys/Tokens

```python
# ✅ GOOD: Proper token validation
@frappe.whitelist(allow_guest=True)
def protected_api():
    token = frappe.get_request_header("Authorization", "").replace("Bearer ", "")

    if not token:
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    # Validate token
    user = validate_api_token(token)
    if not user:
        frappe.throw(_("Invalid token"), frappe.AuthenticationError)

    frappe.set_user(user)

    # Proceed with authenticated request
    return get_user_data()

def validate_api_token(token):
    """Validate JWT or API token"""
    try:
        # Implement token validation logic
        import jwt
        secret = frappe.conf.get("jwt_secret")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload.get("user")
    except:
        return None
```

### NEVER Store Sensitive Data in Plaintext

```python
# ✅ GOOD: Hash passwords
from frappe.utils.password import encrypt_password, check_password

# Store encrypted
encrypted = encrypt_password("user_password")
frappe.db.set_value("User", user, "password", encrypted)

# Verify
is_valid = check_password("user_password", encrypted)

# ❌ BAD: Plaintext passwords
frappe.db.set_value("User", user, "password", "plaintext_password")  # NEVER!
```

## CSRF Protection

### ALWAYS Enabled for State-Changing Operations

Frappe enables CSRF protection by default. Never disable it:

```python
# ❌ BAD: Disabling CSRF (DANGEROUS)
@frappe.whitelist(allow_guest=True, xss_safe=True)  # DON'T!
def unsafe_operation():
    pass

# ✅ GOOD: Keep CSRF enabled (default)
@frappe.whitelist()
def safe_operation():
    # CSRF token required
    pass
```

## File Upload Security

### MANDATORY: Validate File Types and Sizes

```python
@frappe.whitelist()
def upload_customer_document():
    """Upload customer document with validation"""

    files = frappe.request.files
    file = files.get("file")

    if not file:
        frappe.throw(_("No file uploaded"))

    # ✅ GOOD: Validate file type
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        frappe.throw(_("File type not allowed"))

    # ✅ GOOD: Validate file size (10 MB limit)
    max_size = 10 * 1024 * 1024  # 10 MB
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > max_size:
        frappe.throw(_("File too large (max 10 MB)"))

    # ✅ GOOD: Scan for malware (if available)
    # scan_file_for_malware(file)

    # Save file
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": file.filename,
        "attached_to_doctype": "Customer",
        "attached_to_name": frappe.form_dict.customer,
        "content": file.stream.read()
    })
    file_doc.save()

    return {"file_url": file_doc.file_url}
```

## Rate Limiting

### MANDATORY for Public APIs

```python
from frappe.rate_limiter import rate_limit

# ✅ GOOD: Rate limiting on public endpoints
@frappe.whitelist(allow_guest=True)
@rate_limit(limit=10, seconds=60)  # 10 requests per minute
def public_api():
    return {"message": "Success"}

# ✅ GOOD: Stricter limits for sensitive operations
@frappe.whitelist(allow_guest=True)
@rate_limit(limit=3, seconds=60)  # 3 attempts per minute
def login_api(username, password):
    # Login logic
    pass
```

## Sensitive Data Exposure

### NEVER Log or Return Sensitive Data

```python
# ✅ GOOD: Filter sensitive fields
@frappe.whitelist()
def get_customer_data(customer):
    doc = frappe.get_doc("Customer", customer)

    # Return only safe fields
    return {
        "name": doc.name,
        "customer_name": doc.customer_name,
        "email": doc.email,
        "territory": doc.territory
        # Don't expose: credit_limit, internal_notes, etc.
    }

# ❌ BAD: Exposing all fields
@frappe.whitelist()
def get_customer_data(customer):
    doc = frappe.get_doc("Customer", customer)
    return doc.as_dict()  # Exposes everything including sensitive fields!
```

### NEVER Log Passwords or Tokens

```python
# ❌ BAD: Logging sensitive data
frappe.log_error(f"Login attempt: {username}:{password}")  # NEVER!

# ✅ GOOD: Log without sensitive data
frappe.log_error(f"Failed login attempt for user: {username}")
```

## Secure Configuration

### Environment Variables for Secrets

```python
# ✅ GOOD: Use environment variables
import os
API_KEY = os.environ.get("EXTERNAL_API_KEY")

# ✅ GOOD: Use site_config.json (not committed to git)
API_KEY = frappe.conf.get("external_api_key")

# ❌ BAD: Hardcoded secrets
API_KEY = "sk_live_1234567890abcdef"  # NEVER!
```

### Secure site_config.json

```json
// ✅ GOOD: Production config
{
    "db_name": "production_db",
    "developer_mode": 0,
    "disable_website_cache": 0,
    "server_script_enabled": 0,
    "allow_tests": 0,
    "encryption_key": "use-strong-random-key-here"
}

// ❌ BAD: Insecure production config
{
    "developer_mode": 1,  // NEVER in production!
    "server_script_enabled": 1,  // Security risk
    "allow_tests": 1  // Exposes test data
}
```

## Webhook Security

### ALWAYS Verify Webhook Signatures

```python
@frappe.whitelist(allow_guest=True)
def handle_payment_webhook():
    """Handle payment gateway webhook"""

    # ✅ GOOD: Verify signature
    signature = frappe.get_request_header("X-Signature")
    payload = frappe.request.data

    expected_signature = generate_signature(payload)

    if signature != expected_signature:
        frappe.log_error("Invalid webhook signature", "Webhook Security")
        frappe.throw(_("Invalid signature"), frappe.AuthenticationError)

    # Process webhook
    data = json.loads(payload)
    process_payment_event(data)

    return {"status": "received"}

def generate_signature(payload):
    """Generate HMAC signature"""
    import hmac
    import hashlib

    secret = frappe.conf.get("webhook_secret")
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
```

## Security Checklist

Before deploying any Frappe code, verify:

**SQL Injection:**
- [ ] All SQL queries use parameterization
- [ ] No string formatting/concatenation in SQL
- [ ] Prefer `frappe.db` methods over raw SQL

**Permissions:**
- [ ] All `@frappe.whitelist()` methods check permissions
- [ ] `allow_guest=True` is justified and validated
- [ ] Sensitive operations require explicit permission checks

**XSS:**
- [ ] User input is escaped in templates
- [ ] No `| safe` filter on user-controlled content
- [ ] Server-side validation for all inputs

**Authentication:**
- [ ] API tokens/keys are validated
- [ ] Passwords are hashed, never plaintext
- [ ] Sessions expire appropriately

**CSRF:**
- [ ] CSRF protection enabled (default)
- [ ] State-changing operations use POST
- [ ] No CSRF disabling without justification

**File Uploads:**
- [ ] File type validation
- [ ] File size limits
- [ ] Malware scanning (if possible)

**Rate Limiting:**
- [ ] Public APIs have rate limits
- [ ] Login endpoints are rate limited
- [ ] Sensitive operations throttled

**Data Exposure:**
- [ ] Sensitive fields filtered from responses
- [ ] Error messages don't leak details
- [ ] Logs don't contain secrets

**Configuration:**
- [ ] Secrets in environment variables
- [ ] `developer_mode = 0` in production
- [ ] Strong encryption keys

**Webhooks:**
- [ ] Signatures verified
- [ ] Replay attacks prevented
- [ ] Payloads validated

## Reporting Security Issues

If you discover a security vulnerability:
1. **DO NOT** create a public issue
2. Email security contact privately
3. Include detailed reproduction steps
4. Allow time for patch before disclosure
