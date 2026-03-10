---
name: frappe-testing
description: Frappe testing patterns - unit tests, integration tests, fixtures, test runner, and TDD methodology for Frappe applications.
origin: ECC
---

# Frappe Testing Patterns

Comprehensive guide to testing Frappe applications.

## When to Activate

- Writing tests for DocTypes
- Testing API endpoints
- Creating test fixtures
- Running test suites
- Implementing TDD workflow
- Setting up CI/CD pipelines

## Test Structure

```
custom_app/
└── crm/
    └── doctype/
        └── customer/
            ├── customer.py
            ├── test_customer.py       # Unit tests
            └── test_records.json      # Test fixtures
```

## Unit Testing DocTypes

### Basic Test Structure

```python
# test_customer.py
import frappe
import unittest
from frappe.utils import nowdate

class TestCustomer(unittest.TestCase):
    """Test Customer DocType"""

    def setUp(self):
        """Runs before each test method"""
        # Setup test data
        self.test_email = "test_customer@example.com"

    def tearDown(self):
        """Runs after each test method"""
        # Cleanup
        frappe.db.rollback()

    def test_customer_creation(self):
        """Test creating a customer"""
        customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Test Customer",
            "email": self.test_email
        })
        customer.insert()

        self.assertEqual(customer.customer_name, "Test Customer")
        self.assertEqual(customer.email, self.test_email)
        self.assertEqual(customer.status, "Active")  # Default value

    def test_duplicate_email_validation(self):
        """Test that duplicate emails are prevented"""
        # Create first customer
        customer1 = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Customer 1",
            "email": "duplicate@example.com"
        }).insert()

        # Try to create second with same email
        customer2 = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Customer 2",
            "email": "duplicate@example.com"
        })

        self.assertRaises(frappe.ValidationError, customer2.insert)

    def test_credit_limit_negative_validation(self):
        """Test that negative credit limits are rejected"""
        customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Test",
            "credit_limit": -1000
        })

        with self.assertRaises(frappe.ValidationError):
            customer.insert()

    def test_customer_update(self):
        """Test updating customer details"""
        customer = make_customer()

        customer.customer_name = "Updated Name"
        customer.save()

        # Reload and verify
        customer.reload()
        self.assertEqual(customer.customer_name, "Updated Name")

    def test_customer_delete(self):
        """Test customer deletion"""
        customer = make_customer()
        customer_name = customer.name

        customer.delete()

        self.assertFalse(frappe.db.exists("Customer", customer_name))

# Helper function
def make_customer(**kwargs):
    """Create test customer"""
    customer = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": kwargs.get("customer_name", "Test Customer"),
        "email": kwargs.get("email", frappe.generate_hash() + "@test.com")
    })
    customer.insert()
    return customer
```

## Test Fixtures

### Using test_records.json

```json
// test_records.json
[
    {
        "doctype": "Customer",
        "name": "_Test Customer 1",
        "customer_name": "Test Customer 1",
        "email": "customer1@test.com",
        "status": "Active"
    },
    {
        "doctype": "Customer",
        "name": "_Test Customer 2",
        "customer_name": "Test Customer 2",
        "email": "customer2@test.com",
        "status": "Active"
    }
]
```

### Loading Fixtures

```python
from frappe.test_runner import make_test_records

class TestSalesOrder(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Run once before all tests"""
        # Load test customers
        make_test_records("Customer")
        # Load test items
        make_test_records("Item")

    def test_order_creation(self):
        """Test creating order with test data"""
        order = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": "_Test Customer 1",
            "items": [{
                "item_code": "_Test Item",
                "qty": 10
            }]
        })
        order.insert()

        self.assertEqual(order.customer, "_Test Customer 1")
```

## Permission Testing

```python
def test_user_permissions(self):
    """Test that users can only see their own customers"""

    # Create customers
    customer1 = make_customer(sales_person="user1@test.com")
    customer2 = make_customer(sales_person="user2@test.com")

    # Set user context
    frappe.set_user("user1@test.com")

    # User1 should see their customer
    self.assertTrue(frappe.has_permission("Customer", doc=customer1))

    # User1 should NOT see user2's customer
    self.assertFalse(frappe.has_permission("Customer", doc=customer2))

    # Admin should see all
    frappe.set_user("Administrator")
    self.assertTrue(frappe.has_permission("Customer", doc=customer1))
    self.assertTrue(frappe.has_permission("Customer", doc=customer2))
```

## API Testing

```python
class TestCustomerAPI(unittest.TestCase):
    """Test Customer API endpoints"""

    def setUp(self):
        """Setup API test data"""
        self.customer = make_customer()

    def tearDown(self):
        frappe.db.rollback()

    def test_get_customer_balance(self):
        """Test getting customer balance via API"""
        from myapp.api import get_customer_balance

        # Test with valid customer
        result = get_customer_balance(self.customer.name)

        self.assertIn("balance", result)
        self.assertIn("currency", result)
        self.assertEqual(result["customer"], self.customer.name)

    def test_api_permission_error(self):
        """Test API permission check"""
        from myapp.api import delete_customer

        # Set user without delete permission
        frappe.set_user("user@test.com")

        with self.assertRaises(frappe.PermissionError):
            delete_customer(self.customer.name)

    def test_api_validation_error(self):
        """Test API input validation"""
        from myapp.api import get_customer_balance

        # Test with invalid customer
        with self.assertRaises(frappe.DoesNotExistError):
            get_customer_balance("INVALID-CUSTOMER")
```

## Integration Testing

```python
class TestOrderWorkflow(unittest.TestCase):
    """Test complete order workflow"""

    def test_order_to_invoice_flow(self):
        """Test order creation, submission, and invoicing"""

        # 1. Create order
        order = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": "_Test Customer",
            "items": [{
                "item_code": "_Test Item",
                "qty": 10,
                "rate": 100
            }]
        })
        order.insert()

        self.assertEqual(order.status, "Draft")
        self.assertEqual(order.grand_total, 1000)

        # 2. Submit order
        order.submit()
        self.assertEqual(order.docstatus, 1)
        self.assertEqual(order.status, "Submitted")

        # 3. Create invoice from order
        invoice = make_sales_invoice(order.name)
        invoice.insert()

        self.assertEqual(invoice.customer, order.customer)
        self.assertEqual(invoice.grand_total, order.grand_total)

        # 4. Submit invoice
        invoice.submit()
        self.assertEqual(invoice.status, "Submitted")

        # 5. Create payment
        payment = make_payment_entry(invoice.name)
        payment.insert()
        payment.submit()

        # 6. Verify invoice is paid
        invoice.reload()
        self.assertEqual(invoice.outstanding_amount, 0)
```

## Database Testing

```python
def test_database_operations(self):
    """Test database queries"""

    # Create test data
    for i in range(5):
        make_customer(customer_name=f"Customer {i}")

    # Test get_all
    customers = frappe.get_all("Customer",
        filters={"customer_name": ["like", "Customer%"]},
        fields=["name", "customer_name"],
        order_by="customer_name"
    )

    self.assertEqual(len(customers), 5)
    self.assertEqual(customers[0]["customer_name"], "Customer 0")

    # Test db.count
    count = frappe.db.count("Customer", {
        "customer_name": ["like", "Customer%"]
    })
    self.assertEqual(count, 5)

    # Test db.get_value
    first_customer = customers[0]["name"]
    name = frappe.db.get_value("Customer", first_customer, "customer_name")
    self.assertEqual(name, "Customer 0")
```

## Background Job Testing

```python
def test_background_job(self):
    """Test asynchronous background job"""

    from myapp.tasks import send_customer_emails

    # Enqueue job
    frappe.enqueue(
        send_customer_emails,
        queue="short",
        timeout=300,
        customers=["_Test Customer 1"]
    )

    # In actual tests, mock the job or test synchronously
    send_customer_emails(customers=["_Test Customer 1"])

    # Verify email was sent (check Email Queue)
    emails = frappe.get_all("Email Queue",
        filters={"reference_doctype": "Customer"}
    )

    self.assertGreater(len(emails), 0)
```

## Running Tests

### Command Line

```bash
# Run all tests for an app
bench --site test_site run-tests --app custom_app

# Run tests for specific DocType
bench --site test_site run-tests --doctype "Customer"

# Run specific test file
bench --site test_site run-tests --module custom_app.crm.doctype.customer.test_customer

# Run specific test method
bench --site test_site run-tests --module custom_app.crm.doctype.customer.test_customer --test test_customer_creation

# Run tests with coverage
bench --site test_site run-tests --app custom_app --coverage

# Run tests in parallel
bench --site test_site run-tests --app custom_app --parallel

# Run failed tests only
bench --site test_site run-tests --app custom_app --failfast
```

### Test Configuration

```python
# In hooks.py
# Specify test dependencies
before_tests = "myapp.setup.install_test_data"

# Specify test runner
test_runner = "frappe.test_runner"
```

## UI Testing (Playwright)

```python
# test_customer_ui.py
def test_customer_form_ui(browser):
    """Test customer form in browser"""

    # Login
    browser.login("Administrator", "admin")

    # Navigate to Customer form
    browser.new_doc("Customer")

    # Fill form
    browser.fill_field("customer_name", "UI Test Customer")
    browser.fill_field("email", "uitest@example.com")

    # Save
    browser.click("Save")

    # Verify
    browser.assert_title("UI Test Customer")
```

## Mock External Services

```python
from unittest.mock import patch, MagicMock

def test_external_api_call(self):
    """Test integration with external payment gateway"""

    with patch('myapp.payment.requests.post') as mock_post:
        # Mock successful response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "success": True,
            "transaction_id": "TXN123"
        }
        mock_post.return_value = mock_response

        # Call function that uses external API
        from myapp.payment import process_payment
        result = process_payment("ORD-001", 1000)

        # Verify mock was called
        mock_post.assert_called_once()

        # Verify result
        self.assertTrue(result["success"])
        self.assertEqual(result["transaction_id"], "TXN123")
```

## Test Data Generators

```python
def make_test_customer(**kwargs):
    """Generate test customer with random data"""
    from frappe.utils import random_string

    return frappe.get_doc({
        "doctype": "Customer",
        "customer_name": kwargs.get("customer_name", random_string(10)),
        "email": kwargs.get("email", random_string(8) + "@test.com"),
        "phone": kwargs.get("phone", "+1" + random_string(10, chars="0123456789")),
        "status": kwargs.get("status", "Active")
    }).insert()

def make_test_order(customer=None, items=None):
    """Generate test sales order"""
    if not customer:
        customer = make_test_customer()

    if not items:
        items = [{
            "item_code": "_Test Item",
            "qty": 10,
            "rate": 100
        }]

    return frappe.get_doc({
        "doctype": "Sales Order",
        "customer": customer.name if hasattr(customer, "name") else customer,
        "items": items
    }).insert()
```

## Best Practices

**DO:**
- ✅ Write tests BEFORE implementation (TDD)
- ✅ Test both success and failure cases
- ✅ Use descriptive test names
- ✅ Keep tests independent and isolated
- ✅ Use fixtures for test data
- ✅ Test permissions explicitly
- ✅ Mock external services
- ✅ Aim for 80%+ coverage
- ✅ Run tests in CI/CD pipeline

**DON'T:**
- ❌ Test implementation details
- ❌ Write tests that depend on order
- ❌ Skip cleanup (use rollback)
- ❌ Hardcode test data IDs
- ❌ Test framework code
- ❌ Make real external API calls in tests
- ❌ Ignore failing tests

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.10'

      - name: Install bench
        run: |
          pip install frappe-bench

      - name: Setup bench
        run: |
          bench init --skip-redis-config-generation frappe-bench
          cd frappe-bench
          bench get-app $GITHUB_WORKSPACE

      - name: Run tests
        run: |
          cd frappe-bench
          bench --site test_site run-tests --app custom_app --coverage
```

## Next Steps

- Master bench commands → `frappe-bench-usage`
- Implement permissions → `frappe-permissions`
- Optimize performance → `frappe-performance`
- Deploy to production → `frappe-deployment`
