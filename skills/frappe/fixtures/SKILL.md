---
name: frappe-fixtures
description: Frappe data fixtures - import/export master data, test data, configuration data, and data migration patterns.
origin: ECC
---

# Frappe Fixtures

Guide to managing master data, test fixtures, and data import/export in Frappe.

## When to Activate

- Seeding initial data
- Creating test data
- Migrating data between environments
- Importing bulk data
- Exporting configurations
- Setting up demo data

## Fixture Types

### 1. App Fixtures (Master Data)

Configuration and master data bundled with app.

### 2. Test Fixtures

Test data for automated tests.

### 3. Data Import

User-driven bulk data import.

### 4. Data Migration

Moving data between systems/versions.

## App Fixtures

### Configuring Fixtures in hooks.py

```python
# In hooks.py
fixtures = [
    # Export all records of these DocTypes
    "Custom Field",
    "Property Setter",
    "Workflow",

    # Export specific records with filters
    {
        "dt": "Role",
        "filters": [
            ["name", "in", ["CRM Manager", "CRM User", "Sales Manager"]]
        ]
    },
    {
        "dt": "Territory",
        "filters": [
            ["is_group", "=", 1]
        ]
    },
    {
        "dt": "Email Template",
        "filters": [
            ["module", "=", "Custom App"]
        ]
    }
]
```

### Exporting Fixtures

```bash
# Export fixtures configured in hooks.py
bench --site site1.local export-fixtures --app custom_app

# This creates/updates JSON files in:
# custom_app/custom_app/fixtures/*.json
```

### Fixture File Structure

```json
// custom_app/fixtures/role.json
[
    {
        "doctype": "Role",
        "name": "CRM Manager",
        "desk_access": 1,
        "disabled": 0,
        "is_custom": 1,
        "modified": "2024-01-01 00:00:00",
        "role_name": "CRM Manager"
    },
    {
        "doctype": "Role",
        "name": "CRM User",
        "desk_access": 1,
        "disabled": 0,
        "is_custom": 1,
        "modified": "2024-01-01 00:00:00",
        "role_name": "CRM User"
    }
]
```

### Importing Fixtures

```bash
# Import all fixtures for app
bench --site site1.local import-fixtures --app custom_app

# This reads from custom_app/fixtures/*.json
```

### Installing Fixtures on App Install

Fixtures are automatically imported when app is installed:

```bash
bench --site site1.local install-app custom_app
# Fixtures imported automatically
```

## Test Fixtures

### test_records.json

```json
// custom_app/crm/doctype/customer/test_records.json
[
    {
        "doctype": "Customer",
        "name": "_Test Customer 1",
        "customer_name": "Test Customer 1",
        "email": "customer1@test.com",
        "territory": "_Test Territory",
        "customer_group": "_Test Customer Group",
        "status": "Active"
    },
    {
        "doctype": "Customer",
        "name": "_Test Customer 2",
        "customer_name": "Test Customer 2",
        "email": "customer2@test.com",
        "territory": "_Test Territory",
        "customer_group": "_Test Customer Group",
        "status": "Active"
    }
]
```

### Using Test Fixtures

```python
# In test_customer.py
from frappe.test_runner import make_test_records

class TestCustomer(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Load test fixtures once for all tests"""
        # Load test customers
        make_test_records("Customer")

        # Load dependencies
        make_test_records("Territory")
        make_test_records("Customer Group")

    def test_customer_creation(self):
        """Test using fixture data"""
        customer = frappe.get_doc("Customer", "_Test Customer 1")

        self.assertEqual(customer.customer_name, "Test Customer 1")
        self.assertEqual(customer.status, "Active")
```

### Dynamic Test Data

```python
def make_test_customer(**kwargs):
    """Create test customer with random data"""
    from frappe.utils import random_string

    customer = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": kwargs.get("customer_name", f"Test {random_string(5)}"),
        "email": kwargs.get("email", f"{random_string(8)}@test.com"),
        "territory": kwargs.get("territory", "_Test Territory"),
        "customer_group": kwargs.get("customer_group", "_Test Customer Group"),
        "status": kwargs.get("status", "Active")
    })

    customer.insert()
    return customer
```

## Data Import

### CSV Import

```bash
# Import via CLI
bench --site site1.local import-csv /path/to/customers.csv --doctype "Customer"

# With options
bench --site site1.local import-csv /path/to/file.csv \
    --doctype "Customer" \
    --submit-after-import \
    --mute-emails
```

### CSV Format

```csv
ID,Customer Name,Email,Territory,Status
CUST-001,John Doe,john@example.com,North,Active
CUST-002,Jane Smith,jane@example.com,South,Active
CUST-003,Bob Johnson,bob@example.com,East,Active
```

### Programmatic Import

```python
@frappe.whitelist()
def import_customers_from_csv(file_path):
    """Import customers from CSV file"""

    import csv

    with open(file_path, 'r') as csvfile:
        reader = csv.DictReader(csvfile)

        for row in reader:
            # Check if customer exists
            if frappe.db.exists("Customer", row['ID']):
                # Update existing
                customer = frappe.get_doc("Customer", row['ID'])
                customer.customer_name = row['Customer Name']
                customer.email = row['Email']
                customer.save()
            else:
                # Create new
                customer = frappe.get_doc({
                    "doctype": "Customer",
                    "name": row['ID'],
                    "customer_name": row['Customer Name'],
                    "email": row['Email'],
                    "territory": row['Territory'],
                    "status": row['Status']
                })
                customer.insert()

            frappe.db.commit()

    return {"imported": reader.line_num}
```

### Excel Import

```python
def import_from_excel(file_path, sheet_name="Sheet1"):
    """Import data from Excel file"""

    import openpyxl

    wb = openpyxl.load_workbook(file_path)
    ws = wb[sheet_name]

    # Get headers from first row
    headers = [cell.value for cell in ws[1]]

    # Process data rows
    for row in ws.iter_rows(min_row=2, values_only=True):
        data = dict(zip(headers, row))

        # Create document
        doc = frappe.get_doc({
            "doctype": "Customer",
            **data
        })
        doc.insert()

        frappe.db.commit()
```

### Data Import Tool (UI)

Access via: Home > Data Import

Features:
- Upload CSV/Excel
- Map columns to fields
- Validate before import
- Preview changes
- Submit after import
- Error handling

## Data Export

### CSV Export

```python
@frappe.whitelist()
def export_customers_to_csv(filters=None):
    """Export customers to CSV"""

    import csv
    from io import StringIO

    # Get data
    customers = frappe.get_all("Customer",
        filters=filters or {},
        fields=["name", "customer_name", "email", "territory", "status"]
    )

    # Create CSV
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=["name", "customer_name", "email", "territory", "status"])

    writer.writeheader()
    writer.writerows(customers)

    # Return for download
    frappe.response.filename = "customers.csv"
    frappe.response.filecontent = output.getvalue()
    frappe.response.type = "download"
```

### Excel Export

```python
@frappe.whitelist()
def export_to_excel(doctype, filters=None):
    """Export DocType to Excel"""

    from frappe.utils.xlsxutils import make_xlsx

    # Get data
    data = frappe.get_all(doctype,
        filters=filters or {},
        fields="*"
    )

    # Get columns
    meta = frappe.get_meta(doctype)
    columns = [field.fieldname for field in meta.fields if field.fieldtype not in ["Table", "HTML", "Code"]]

    # Create Excel
    xlsx_file = make_xlsx(data, doctype, columns=columns)

    # Return for download
    frappe.response.filename = f"{doctype}.xlsx"
    frappe.response.filecontent = xlsx_file.getvalue()
    frappe.response.type = "download"
```

### Bulk Export

```bash
# Export all records of a DocType
bench --site site1.local export-doc Customer \
    --path /tmp/customers.json

# Export with filters
bench --site site1.local export-doc "Sales Order" \
    --filters '{"docstatus": 1, "status": "Completed"}' \
    --path /tmp/sales_orders.json
```

## Data Migration

### Migration Scripts

```python
# File: custom_app/patches/v1_0/migrate_customer_data.py

import frappe

def execute():
    """Migrate customer data from old structure to new"""

    # Get all customers
    customers = frappe.get_all("Customer", fields=["name"])

    for customer in customers:
        doc = frappe.get_doc("Customer", customer.name)

        # Migrate data
        if doc.old_field:
            doc.new_field = transform_data(doc.old_field)
            doc.save()

    frappe.db.commit()

def transform_data(old_value):
    """Transform old data format to new format"""
    # Transformation logic
    return new_value
```

### Register Migration in patches.txt

```
# custom_app/patches.txt
custom_app.patches.v1_0.migrate_customer_data
custom_app.patches.v1_0.update_territory_structure
custom_app.patches.v1_1.add_customer_categories
```

### Running Migrations

```bash
# Run all pending patches
bench --site site1.local migrate

# The patches.txt file is automatically processed
```

### Data Transformation

```python
def migrate_territories():
    """Migrate territory structure"""

    # Create new parent territories
    parent_territories = [
        {"name": "North America", "is_group": 1},
        {"name": "Europe", "is_group": 1},
        {"name": "Asia", "is_group": 1}
    ]

    for territory_data in parent_territories:
        if not frappe.db.exists("Territory", territory_data["name"]):
            territory = frappe.get_doc({
                "doctype": "Territory",
                **territory_data
            })
            territory.insert()

    # Update child territories
    frappe.db.sql("""
        UPDATE `tabTerritory`
        SET parent_territory = 'North America'
        WHERE name IN ('USA', 'Canada', 'Mexico')
    """)

    frappe.db.commit()
```

## Data Synchronization

### Sync from External System

```python
@frappe.whitelist()
def sync_customers_from_crm():
    """Sync customers from external CRM"""

    import requests

    # Fetch from external API
    response = requests.get("https://external-crm.com/api/customers")
    external_customers = response.json()

    synced = 0
    for customer_data in external_customers:
        # Check if exists
        if frappe.db.exists("Customer", {"external_id": customer_data["id"]}):
            # Update
            customer = frappe.get_doc("Customer", {"external_id": customer_data["id"]})
            customer.customer_name = customer_data["name"]
            customer.email = customer_data["email"]
            customer.save()
        else:
            # Create
            customer = frappe.get_doc({
                "doctype": "Customer",
                "customer_name": customer_data["name"],
                "email": customer_data["email"],
                "external_id": customer_data["id"],
                "external_sync": 1
            })
            customer.insert()

        synced += 1

    frappe.db.commit()

    return {"synced": synced}
```

### Scheduled Sync

```python
# In hooks.py
scheduler_events = {
    "hourly": [
        "custom_app.sync.sync_external_data"
    ]
}

def sync_external_data():
    """Scheduled data synchronization"""

    # Sync customers
    sync_customers_from_crm()

    # Sync products
    sync_products_from_inventory()

    # Log sync
    frappe.get_doc({
        "doctype": "Sync Log",
        "sync_type": "Scheduled",
        "status": "Success",
        "timestamp": frappe.utils.now()
    }).insert()
```

## Data Validation

### Validate Import Data

```python
def validate_import_data(data):
    """Validate data before import"""

    errors = []

    for idx, row in enumerate(data, start=1):
        # Required fields
        if not row.get("customer_name"):
            errors.append(f"Row {idx}: Customer Name is required")

        # Email validation
        if row.get("email") and not frappe.utils.validate_email_address(row["email"]):
            errors.append(f"Row {idx}: Invalid email format")

        # Duplicate check
        if frappe.db.exists("Customer", {"email": row.get("email")}):
            errors.append(f"Row {idx}: Email already exists")

        # Territory validation
        if row.get("territory") and not frappe.db.exists("Territory", row["territory"]):
            errors.append(f"Row {idx}: Territory does not exist")

    if errors:
        frappe.throw("<br>".join(errors))

    return True
```

## Backup and Restore

### Create Backup

```bash
# Backup with files
bench --site site1.local backup --with-files

# Backup to specific path
bench --site site1.local backup --backup-path /backups/manual

# Backup specific DocTypes
bench --site site1.local export-doc Customer --path /tmp/customers.json
```

### Restore Backup

```bash
# Restore database
bench --site site1.local restore /path/to/backup.sql.gz

# Restore with files
bench --site site1.local restore /path/to/backup.sql.gz --with-files /path/to/files.tar
```

## Best Practices

**DO:**
- ✅ Version control fixture files
- ✅ Use filters to export only necessary data
- ✅ Validate data before import
- ✅ Handle errors gracefully
- ✅ Log import/export operations
- ✅ Test migrations on staging first
- ✅ Backup before data operations
- ✅ Use transactions for bulk operations

**DON'T:**
- ❌ Export sensitive data in fixtures
- ❌ Hardcode site-specific IDs
- ❌ Skip data validation
- ❌ Import without testing
- ❌ Modify core DocType fixtures
- ❌ Forget to commit after import
- ❌ Export unnecessary fields
- ❌ Ignore duplicate checks

## Fixture Patterns

### Hierarchical Data

```json
// Territory fixtures with parent-child
[
    {
        "doctype": "Territory",
        "name": "All Territories",
        "is_group": 1,
        "parent_territory": ""
    },
    {
        "doctype": "Territory",
        "name": "North America",
        "is_group": 1,
        "parent_territory": "All Territories"
    },
    {
        "doctype": "Territory",
        "name": "USA",
        "is_group": 0,
        "parent_territory": "North America"
    }
]
```

### Related Data

```json
// Customer with addresses
[
    {
        "doctype": "Customer",
        "name": "CUST-001",
        "customer_name": "Test Customer",
        "addresses": [
            {
                "address_title": "Billing",
                "address_line1": "123 Main St",
                "city": "New York",
                "country": "USA"
            },
            {
                "address_title": "Shipping",
                "address_line1": "456 Oak Ave",
                "city": "Boston",
                "country": "USA"
            }
        ]
    }
]
```

## Testing with Fixtures

```python
class TestSalesOrder(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Load test fixtures"""
        make_test_records("Customer")
        make_test_records("Item")
        make_test_records("Territory")

    def test_order_creation_with_fixtures(self):
        """Test using fixture data"""
        order = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": "_Test Customer 1",
            "items": [{
                "item_code": "_Test Item",
                "qty": 10
            }]
        })
        order.insert()

        self.assertTrue(frappe.db.exists("Sales Order", order.name))
```

## Next Steps

- Optimize performance → `frappe-performance`
- Handle schema migrations → `frappe-migrations`
- Deploy to production → `frappe-deployment`
