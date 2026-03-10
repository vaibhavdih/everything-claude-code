---
name: frappe-migrations
description: Frappe schema and data migrations - patches, version management, database changes, and migration best practices.
origin: ECC
---

# Frappe Migrations

Guide to managing schema changes, data migrations, and version upgrades in Frappe.

## When to Activate

- Adding/modifying DocType fields
- Changing database schema
- Migrating data between versions
- Upgrading Frappe apps
- Transforming existing data
- Deprecating features

## Migration Types

### 1. Schema Migrations

Changes to DocType structure (fields, tables).

### 2. Data Migrations

Transforming existing data.

### 3. Patches

One-time scripts for upgrades.

## Schema Migrations

### Automatic Migrations

Frappe automatically migrates when you:
- Add/remove fields in DocType JSON
- Change field types
- Add/remove DocTypes

```bash
# Run migrations after changes
bench --site site1.local migrate
```

### Field Addition

```json
// In customer.json - add new field
{
    "fields": [
        {
            "fieldname": "loyalty_points",
            "fieldtype": "Int",
            "label": "Loyalty Points",
            "default": 0
        }
    ]
}
```

```bash
bench --site site1.local migrate
# Creates loyalty_points column in tabCustomer
```

### Field Type Change

```json
// Change field type
{
    "fieldname": "phone",
    "fieldtype": "Data",  // Was "Phone"
    "label": "Phone"
}
```

**WARNING**: Some type changes may lose data!

### Safe Field Changes

- Data → Text (safe)
- Int → Float (safe)
- Data → Link (needs data migration)
- Select → Data (safe)

### Unsafe Field Changes

- Text → Data (truncates > 140 chars)
- Float → Int (loses decimals)
- Link → Data (loses validation)

## Data Migration Patches

### Creating Patches

```python
# File: custom_app/patches/v1_0/migrate_customer_phone_numbers.py

import frappe

def execute():
    """Migrate phone numbers to new format"""

    frappe.reload_doctype("Customer")

    customers = frappe.get_all("Customer",
        filters={"phone": ["!=", ""]},
        fields=["name", "phone"]
    )

    for customer in customers:
        # Transform phone number
        new_phone = transform_phone_number(customer.phone)

        # Update
        frappe.db.set_value("Customer", customer.name, "phone", new_phone)

    frappe.db.commit()

    print(f"Migrated {len(customers)} phone numbers")

def transform_phone_number(old_phone):
    """Transform old format to new format"""

    # Remove special characters
    phone = old_phone.replace("-", "").replace("(", "").replace(")", "").replace(" ", "")

    # Add country code if missing
    if not phone.startswith("+"):
        phone = "+1" + phone

    return phone
```

### Register Patch

```
# File: custom_app/patches.txt
custom_app.patches.v1_0.migrate_customer_phone_numbers
custom_app.patches.v1_0.update_territory_structure
custom_app.patches.v1_1.add_default_roles
```

### Patch Execution

```bash
# Run all pending patches
bench --site site1.local migrate

# Patches are tracked in 'Patch Log' DocType
```

### Patch Best Practices

```python
def execute():
    """Best practice patch structure"""

    # 1. Reload DocType metadata
    frappe.reload_doctype("Customer")

    # 2. Get data in batches
    batch_size = 1000
    customers = frappe.get_all("Customer", limit_page_length=batch_size)

    # 3. Process in batches
    for customer in customers:
        migrate_customer(customer.name)

        # Commit periodically
        if customers.index(customer) % 100 == 0:
            frappe.db.commit()

    # 4. Final commit
    frappe.db.commit()

    # 5. Clear cache
    frappe.clear_cache()
```

## Version Management

### App Versioning

```python
# In hooks.py
app_version = "1.1.0"

# Follow Semantic Versioning
# MAJOR.MINOR.PATCH
# 1.0.0 -> 1.1.0 (new features)
# 1.1.0 -> 1.1.1 (bug fixes)
# 1.1.1 -> 2.0.0 (breaking changes)
```

### Version-Specific Patches

```
# patches.txt - organized by version
custom_app.patches.v1_0.initial_setup
custom_app.patches.v1_0.add_custom_fields

custom_app.patches.v1_1.migrate_data_format
custom_app.patches.v1_1.update_workflows

custom_app.patches.v2_0.breaking_change_migration
```

## Complex Migrations

### Multi-Step Migration

```python
# Step 1: Add new field
def add_new_field():
    """Patch 1: Add new field"""

    # Field added via DocType JSON
    frappe.reload_doctype("Customer")

# Step 2: Migrate data
def migrate_to_new_field():
    """Patch 2: Populate new field from old field"""

    frappe.db.sql("""
        UPDATE `tabCustomer`
        SET new_field = old_field
        WHERE old_field IS NOT NULL
    """)

    frappe.db.commit()

# Step 3: Remove old field
def remove_old_field():
    """Patch 3: Remove deprecated field"""

    # Field removed from DocType JSON
    frappe.reload_doctype("Customer")

    # Drop column
    frappe.db.sql("ALTER TABLE `tabCustomer` DROP COLUMN old_field")
```

### DocType Rename

```python
def rename_doctype():
    """Rename DocType"""

    frappe.rename_doc("DocType", "Old Name", "New Name")

    # Update references
    frappe.db.sql("""
        UPDATE `tabSales Order`
        SET doctype_field = 'New Name'
        WHERE doctype_field = 'Old Name'
    """)

    frappe.db.commit()
```

### Table Migration

```python
def migrate_to_child_table():
    """Migrate data to child table"""

    # Get parent records
    orders = frappe.get_all("Sales Order", fields=["name"])

    for order in orders:
        doc = frappe.get_doc("Sales Order", order.name)

        # Migrate old data to child table
        if doc.old_items_data:
            items = parse_old_format(doc.old_items_data)

            doc.items = []
            for item_data in items:
                doc.append("items", {
                    "item_code": item_data["code"],
                    "qty": item_data["quantity"],
                    "rate": item_data["price"]
                })

            doc.save()

    frappe.db.commit()
```

## Rollback Strategies

### Backup Before Migration

```bash
# MANDATORY: Backup before running migrations
bench --site site1.local backup --with-files

# Run migrations
bench --site site1.local migrate

# If issues, restore backup
bench --site site1.local restore /path/to/backup.sql.gz
```

### Reversible Patches

```python
def execute():
    """Reversible patch with rollback"""

    try:
        # Migration logic
        migrate_data()

        # Verify migration
        if not verify_migration():
            raise Exception("Migration verification failed")

        frappe.db.commit()

    except Exception as e:
        # Rollback on error
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Migration Failed")
        raise
```

## Testing Migrations

### Test on Staging

```bash
# 1. Clone production to staging
bench --site production backup
bench --site staging restore /path/to/production_backup.sql.gz

# 2. Test migration on staging
bench --site staging migrate

# 3. Verify data integrity
bench --site staging run-tests

# 4. If successful, apply to production
```

### Migration Tests

```python
class TestCustomerMigration(unittest.TestCase):
    """Test customer data migration"""

    def setUp(self):
        """Create test data"""
        self.customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "Test",
            "old_phone": "123-456-7890"
        }).insert()

    def test_phone_migration(self):
        """Test phone number migration"""
        from custom_app.patches.v1_0.migrate_customer_phone_numbers import execute

        # Run migration
        execute()

        # Verify
        self.customer.reload()
        self.assertEqual(self.customer.phone, "+11234567890")
```

## Deployment Migrations

### Pre-Deployment

```bash
# 1. Backup
bench --site site1.local backup --with-files

# 2. Pull latest code
bench update --pull

# 3. Update dependencies
bench setup requirements

# 4. Build assets
bench build --production
```

### During Deployment

```bash
# 5. Run migrations
bench --site site1.local migrate

# 6. Clear cache
bench --site site1.local clear-cache

# 7. Restart services
sudo supervisorctl restart all
```

### Post-Deployment

```bash
# 8. Verify site health
bench --site site1.local doctor

# 9. Check logs
tail -f sites/site1.local/logs/error.log

# 10. Run smoke tests
bench --site site1.local run-ui-tests custom_app --test test_critical_flows
```

## Breaking Changes

### Deprecation Process

```python
# Version 1.0: Add deprecation warning
class Customer(Document):
    def validate(self):
        if self.old_field:
            frappe.msgprint(
                "Warning: old_field is deprecated and will be removed in v2.0. Please use new_field.",
                indicator="orange"
            )

# Version 1.1: Add migration path
def migrate_old_to_new():
    """Migrate old_field to new_field"""
    pass

# Version 2.0: Remove old_field
# Field removed from DocType JSON
```

### Announce Breaking Changes

```markdown
# CHANGELOG.md

## Version 2.0.0 (Breaking Changes)

### Removed
- `Customer.old_field` - Use `Customer.new_field` instead
- `get_old_api()` method - Use `get_new_api()` instead

### Migration Guide
1. Run migration: `bench --site site1.local migrate`
2. Update custom code to use `new_field`
3. Test thoroughly
```

## Best Practices

**DO:**
- ✅ Always backup before migrations
- ✅ Test on staging first
- ✅ Use patches.txt for tracking
- ✅ Handle errors gracefully
- ✅ Reload DocType metadata
- ✅ Process data in batches
- ✅ Commit periodically
- ✅ Log migration progress
- ✅ Verify migration success

**DON'T:**
- ❌ Run migrations in production without testing
- ❌ Modify core Frappe migrations
- ❌ Skip backups
- ❌ Change field types without data migration
- ❌ Load all data in memory
- ❌ Skip error handling
- ❌ Forget to clear cache after migration
- ❌ Leave incomplete migrations

## Migration Checklist

- [ ] Backup created
- [ ] Tested on staging
- [ ] Patch registered in patches.txt
- [ ] Error handling implemented
- [ ] Batch processing for large data
- [ ] Verification logic included
- [ ] Rollback plan documented
- [ ] Team notified of changes
- [ ] Migration tested end-to-end
- [ ] Deployment window scheduled
