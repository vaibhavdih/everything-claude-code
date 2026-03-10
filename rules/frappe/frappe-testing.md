# Frappe Testing Requirements

MANDATORY: 80% minimum test coverage for all Frappe applications.

## Test-Driven Development (TDD)

### RED-GREEN-REFACTOR Cycle

**ALWAYS follow TDD workflow:**

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Improve code while keeping tests green

```python
# Step 1: RED - Write test (it will fail)
def test_customer_creation(self):
    customer = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": "Test Customer",
        "email": "test@example.com"
    })
    customer.insert()

    self.assertEqual(customer.status, "Active")  # Will fail initially

# Step 2: GREEN - Implement to pass
class Customer(Document):
    def validate(self):
        if not self.status:
            self.status = "Active"  # Now test passes

# Step 3: REFACTOR - Improve code
class Customer(Document):
    def validate(self):
        self.set_default_status()

    def set_default_status(self):
        """Set default status if not provided"""
        if not self.status:
            self.status = "Active"
```

## Coverage Requirements

### Minimum 80% Coverage

```bash
# Run tests with coverage
bench --site test_site run-tests --app custom_app --coverage

# Coverage report should show >= 80%
File                  Stmts   Miss  Cover
-----------------------------------------
customer.py             50      5    90%
sales_order.py          80     10    87%
api.py                  40      4    90%
-----------------------------------------
TOTAL                  170     19    89%   ✓ PASS
```

### 100% Coverage for Critical Code

**MANDATORY 100% coverage for:**
- Financial calculations
- Payment processing
- Authentication logic
- Permission checks
- Data validation
- Security-critical code

## Test Types Required

### 1. Unit Tests (Function-Level)

**MANDATORY for all DocType controllers:**

```python
class TestCustomer(unittest.TestCase):
    """Unit tests for Customer DocType"""

    def test_validate_email_with_valid_email(self):
        """Test email validation accepts valid email"""
        customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Test",
            "email": "valid@example.com"
        })
        customer.insert()  # Should not raise

        self.assertTrue(frappe.db.exists("Customer", customer.name))

    def test_validate_email_with_invalid_email(self):
        """Test email validation rejects invalid email"""
        customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Test",
            "email": "invalid-email"
        })

        with self.assertRaises(frappe.ValidationError):
            customer.insert()

    def test_duplicate_email_prevention(self):
        """Test that duplicate emails are prevented"""
        # Create first customer
        customer1 = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Customer 1",
            "email": "duplicate@example.com"
        }).insert()

        # Try duplicate email
        customer2 = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Customer 2",
            "email": "duplicate@example.com"
        })

        self.assertRaises(frappe.ValidationError, customer2.insert)

    def test_calculate_credit_days(self):
        """Test credit days calculation"""
        customer = make_test_customer(payment_terms="Net 30")

        self.assertEqual(customer.credit_days, 30)
```

### 2. Integration Tests (Component-Level)

**MANDATORY for APIs and workflows:**

```python
def test_order_to_invoice_workflow(self):
    """Test complete order to invoice flow"""

    # Create customer
    customer = make_test_customer()

    # Create order
    order = frappe.get_doc({
        "doctype": "Sales Order",
        "customer": customer.name,
        "items": [{
            "item_code": "_Test Item",
            "qty": 10,
            "rate": 100
        }]
    }).insert()

    # Submit order
    order.submit()

    # Create invoice from order
    invoice = make_sales_invoice(order.name)
    invoice.insert()

    # Verify linkage
    self.assertEqual(invoice.customer, order.customer)
    self.assertEqual(invoice.items[0].sales_order, order.name)

    # Submit invoice
    invoice.submit()

    # Verify order status updated
    order.reload()
    self.assertEqual(order.per_billed, 100)
```

### 3. Permission Tests

**MANDATORY for all security-sensitive operations:**

```python
def test_user_can_only_see_own_customers(self):
    """Test user permissions filter correctly"""

    # Create customers with different owners
    customer1 = make_test_customer(sales_person="user1@test.com")
    customer2 = make_test_customer(sales_person="user2@test.com")

    # Set user context
    frappe.set_user("user1@test.com")

    # User1 should see their customer
    self.assertTrue(frappe.has_permission("Customer", doc=customer1))

    # User1 should NOT see user2's customer
    self.assertFalse(frappe.has_permission("Customer", doc=customer2))

def test_api_permission_check(self):
    """Test API enforces permissions"""
    from myapp.api import delete_customer

    customer = make_test_customer()

    # Set user without delete permission
    frappe.set_user("user@test.com")

    with self.assertRaises(frappe.PermissionError):
        delete_customer(customer.name)
```

### 4. API Tests

**MANDATORY for all whitelisted methods:**

```python
def test_get_customer_balance_api(self):
    """Test customer balance API"""
    from myapp.api import get_customer_balance

    customer = make_test_customer()

    # Set outstanding amount
    frappe.db.set_value("Customer", customer.name, "outstanding_amount", 1000)

    # Call API
    result = get_customer_balance(customer.name)

    # Verify response structure
    self.assertIn("balance", result)
    self.assertIn("currency", result)
    self.assertEqual(result["balance"], 1000)

def test_api_validation_error(self):
    """Test API input validation"""
    from myapp.api import get_customer_balance

    # Test with invalid customer
    with self.assertRaises(frappe.DoesNotExistError):
        get_customer_balance("INVALID-ID")

def test_api_permission_error(self):
    """Test API permission check"""
    from myapp.api import delete_customer

    customer = make_test_customer()
    frappe.set_user("user@test.com")

    with self.assertRaises(frappe.PermissionError):
        delete_customer(customer.name)
```

## Test Structure

### Test Class Organization

```python
import frappe
import unittest
from frappe.utils import nowdate

class TestCustomer(unittest.TestCase):
    """Test Customer DocType

    Tests cover:
    - Creation and validation
    - Business logic
    - Permission checks
    - Edge cases
    """

    @classmethod
    def setUpClass(cls):
        """Run once before all tests in class"""
        # Load shared test data
        pass

    def setUp(self):
        """Run before each test method"""
        # Setup test-specific data
        self.test_customer = make_test_customer()

    def tearDown(self):
        """Run after each test method"""
        # Cleanup
        frappe.db.rollback()

    @classmethod
    def tearDownClass(cls):
        """Run once after all tests in class"""
        # Cleanup class-level data
        pass

    # Test methods here
```

### Test Naming Convention

```python
# ✅ GOOD: Descriptive test names
def test_customer_creation_with_valid_data_succeeds(self):
def test_duplicate_email_raises_validation_error(self):
def test_credit_limit_cannot_be_negative(self):

# ❌ BAD: Vague test names
def test_customer(self):
def test_validation(self):
def test_1(self):
```

## Test Data Management

### Use Fixtures

```json
// test_records.json
[
    {
        "doctype": "Customer",
        "name": "_Test Customer 1",
        "customer_name": "Test Customer 1",
        "email": "customer1@test.com",
        "status": "Active"
    }
]
```

### Test Data Generators

```python
def make_test_customer(**kwargs):
    """Create test customer with defaults"""
    return frappe.get_doc({
        "doctype": "Customer",
        "customer_name": kwargs.get("customer_name", "Test Customer"),
        "email": kwargs.get("email", frappe.generate_hash() + "@test.com"),
        "territory": kwargs.get("territory", "_Test Territory"),
        "status": kwargs.get("status", "Active")
    }).insert()

def make_test_order(customer=None, **kwargs):
    """Create test sales order"""
    if not customer:
        customer = make_test_customer()

    return frappe.get_doc({
        "doctype": "Sales Order",
        "customer": customer.name if hasattr(customer, "name") else customer,
        "items": kwargs.get("items", [{
            "item_code": "_Test Item",
            "qty": 10,
            "rate": 100
        }])
    }).insert()
```

## Mock External Services

```python
from unittest.mock import patch, MagicMock

def test_external_payment_api(self):
    """Test payment processing with mocked external API"""

    with patch('myapp.payment.requests.post') as mock_post:
        # Mock successful response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "success": True,
            "transaction_id": "TXN123"
        }
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        # Call function
        result = process_payment("ORD-001", 1000)

        # Verify mock was called correctly
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(kwargs["json"]["amount"], 1000)

        # Verify result
        self.assertTrue(result["success"])
        self.assertEqual(result["transaction_id"], "TXN123")
```

## Running Tests

### Command Line

```bash
# Run all tests
bench --site test_site run-tests --app custom_app

# Run specific DocType tests
bench --site test_site run-tests --doctype "Customer"

# Run specific test file
bench --site test_site run-tests --module custom_app.crm.doctype.customer.test_customer

# Run with coverage
bench --site test_site run-tests --app custom_app --coverage

# Run failed tests only
bench --site test_site run-tests --app custom_app --failfast

# Run in parallel (faster)
bench --site test_site run-tests --app custom_app --parallel
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Run tests
        run: |
          bench --site test_site run-tests --app custom_app --coverage

      - name: Check coverage
        run: |
          # Fail if coverage < 80%
          coverage report --fail-under=80
```

## Test Best Practices

**ALWAYS:**
- ✅ Write tests BEFORE implementation (TDD)
- ✅ Test both success and failure cases
- ✅ Use descriptive test names
- ✅ Keep tests independent and isolated
- ✅ Use `frappe.db.rollback()` in tearDown
- ✅ Mock external services
- ✅ Test permissions explicitly
- ✅ Aim for 80%+ coverage
- ✅ Run tests in CI/CD

**NEVER:**
- ❌ Skip tests
- ❌ Test implementation details
- ❌ Write tests that depend on execution order
- ❌ Make real external API calls in tests
- ❌ Hardcode test data IDs
- ❌ Ignore failing tests
- ❌ Test framework code
- ❌ Skip permission tests

## Test Review Checklist

Before merging code, verify:

- [ ] All new code has tests
- [ ] Tests follow TDD methodology
- [ ] Coverage is >= 80%
- [ ] All tests pass locally
- [ ] Tests pass in CI/CD
- [ ] Permission tests included
- [ ] API tests included
- [ ] Edge cases covered
- [ ] External services mocked
- [ ] Test data uses fixtures/generators
