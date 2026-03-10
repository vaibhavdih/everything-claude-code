---
description: Frappe framework development orchestrator for DocTypes, APIs, testing, and bench operations. Auto-detects Frappe projects.
---

# Frappe Command

This command provides a unified orchestrator for Frappe framework development workflows.

## What This Command Does

The `/frappe` command intelligently routes Frappe-specific operations:
- **DocType Development** - Create and modify DocTypes with proper structure
- **API Development** - Build REST/RPC APIs with Frappe patterns
- **Testing** - Run Frappe tests with proper fixtures
- **Bench Operations** - Execute bench commands with context
- **Auto-Detection** - Automatically applies Frappe patterns when detected

## When to Use

Use `/frappe` when:
- Working in a Frappe project (auto-detected)
- Creating or modifying DocTypes
- Building REST or RPC APIs
- Running Frappe-specific tests
- Executing bench commands
- Setting up Frappe app structure

## How It Works

When you invoke `/frappe`, the system:

1. **Auto-detects** if you're in a Frappe project (checks for hooks.py, sites/, bench)
2. **Routes** your request to the appropriate workflow
3. **Applies** Frappe-specific patterns and conventions
4. **Integrates** with existing agents (planner, tdd-guide, code-reviewer)

## Usage Patterns

### Interactive Mode (No Arguments)
```bash
/frappe
```
Shows available operations:
- Create/modify DocType
- Build REST/RPC API
- Run tests
- Execute bench commands

### Direct Operations
```bash
/frappe doctype <name>          # Create or modify a DocType
/frappe api <endpoint>           # Create API endpoint
/frappe test [app]               # Run Frappe tests
/frappe bench <command>          # Execute bench command
```

## Example Usage

### Example 1: Creating a DocType

```
User: /frappe doctype Customer

Agent:
# Creating Customer DocType

I'll create a Customer DocType with proper Frappe structure.

## DocType Structure

**Module**: CRM (auto-detected)

**Fields to include:**
1. Customer Name (Data, mandatory)
2. Email (Data, unique)
3. Phone (Data)
4. Address (Text)
5. Customer Type (Select: Individual/Company)
6. Status (Select: Active/Inactive)

## Files to create:
- customer/customer.json (DocType definition)
- customer/customer.py (Controller)
- customer/customer.js (Client script)
- customer/test_customer.py (Unit tests)

Proceed with creation? (yes/no)
```

### Example 2: Creating an API

```
User: /frappe api get customer balance

Agent:
# Creating Customer Balance API

I'll create a REST API endpoint with Frappe patterns.

## API Design

**File**: crm/api/customer.py

**Endpoint**: /api/method/crm.api.customer.get_balance

**Method**: GET

**Authentication**: Required

**Permissions**: Requires "CRM User" role

```python
import frappe
from frappe import _

@frappe.whitelist()
def get_balance(customer):
    """Get customer outstanding balance"""
    if not frappe.has_permission("Customer", "read"):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    balance = frappe.db.get_value(
        "Customer",
        customer,
        "outstanding_amount"
    )

    return {"balance": balance or 0.0}
```

Proceed? (yes/no)
```

### Example 3: Running Tests

```
User: /frappe test

Agent:
# Running Frappe Tests

Detecting test scope...

**App detected**: custom_crm
**Test files found**: 15

Running tests with:
```bash
cd ~/frappe-bench
bench --site test_site run-tests --app custom_crm
```

Results:
- 45 tests passed ✓
- 0 tests failed
- Coverage: 87%
```

### Example 4: Bench Operations

```
User: /frappe bench migrate

Agent:
# Running Bench Migrate

**Context**: frappe-bench detected at ~/frappe-bench
**Site**: site1.local (active site)

Executing:
```bash
cd ~/frappe-bench
bench --site site1.local migrate
```

Migration complete:
- 3 pending patches applied
- Database schema updated
- No errors
```

## Auto-Detection Features

The system automatically detects Frappe projects by checking for:
- `hooks.py` file in app directory
- `sites/` directory structure
- `bench` command availability
- Frappe app structure (modules, doctype folders)

Once detected, ALL existing commands become Frappe-aware:
- `/plan` - Plans with DocTypes and Frappe architecture
- `/tdd` - Uses Frappe testing patterns and fixtures
- `/code-review` - Checks Frappe conventions and security

## Frappe Patterns Applied

When working in a Frappe project, the system applies:

**Naming Conventions:**
- DocTypes: PascalCase
- Fields: snake_case
- Methods: snake_case
- Modules: Title Case with spaces

**Security:**
- Permission checks via `frappe.has_permission()`
- SQL injection prevention with `frappe.db.get_value()`
- XSS prevention with proper escaping
- CSRF protection enabled

**API Patterns:**
- `@frappe.whitelist()` decorator for public APIs
- Permission validation
- Error handling with `frappe.throw()`
- Response formatting

**Testing:**
- Unit tests in `test_*.py`
- Fixtures in `fixtures/`
- Test data in `test_records.json`
- `frappe.set_user()` for permission testing

## Integrated Workflows

### Planning Frappe Features
```bash
/plan add invoice management system
```
The planner automatically considers:
- DocType relationships
- Frappe workflows
- Permission levels
- Print formats
- Reports

### TDD with Frappe
```bash
/tdd implement payment processing
```
The tdd-guide automatically:
- Uses Frappe test patterns
- Creates proper fixtures
- Tests with `frappe.db` mocking
- Validates permissions

### Code Review for Frappe
```bash
/code-review
```
The reviewer checks:
- SQL injection vulnerabilities
- Permission decorator usage
- Proper error handling
- Frappe conventions

## Frappe-Specific Skills

The following skills are automatically loaded for Frappe projects:

**Core Skills:**
- `frappe-architecture` - App structure, modules, hooks
- `frappe-doctype-patterns` - DocType development
- `frappe-api-patterns` - REST/RPC API development
- `frappe-testing` - Unit and integration tests
- `frappe-bench-usage` - Bench commands
- `frappe-permissions` - Role-based permissions

**Advanced Skills:**
- `frappe-workflows` - Workflow states and transitions
- `frappe-reports` - Query/Script reports
- `frappe-fixtures` - Data import/export
- `frappe-performance` - Caching and optimization
- `frappe-migrations` - Schema and data migrations
- `frappe-deployment` - Production deployment

## Common Operations

### Creating a New App
```bash
/frappe
> Create a new Frappe app called "custom_hrms"
```

### Adding Custom Fields
```bash
/frappe
> Add custom fields to Employee DocType: Employee ID (Data), Department (Link)
```

### Creating Workflows
```bash
/frappe
> Create an approval workflow for Leave Application
```

### Running Migrations
```bash
/frappe bench migrate
```

### Building Assets
```bash
/frappe bench build
```

## Best Practices

**DO:**
- ✅ Use `frappe.db.get_value()` for database queries (prevents SQL injection)
- ✅ Check permissions with `frappe.has_permission()`
- ✅ Use `@frappe.whitelist()` for API endpoints
- ✅ Handle errors with `frappe.throw()`
- ✅ Write tests for all DocType controllers
- ✅ Use fixtures for test data

**DON'T:**
- ❌ Use raw SQL queries (`frappe.db.sql()` without validation)
- ❌ Skip permission checks in whitelisted methods
- ❌ Hardcode site-specific data
- ❌ Modify core Frappe DocTypes directly
- ❌ Skip migrations after schema changes
- ❌ Ignore bench command errors

## Troubleshooting

### DocType Not Loading
```bash
/frappe bench clear-cache
/frappe bench migrate
```

### Import Errors
```bash
/frappe bench restart
```

### Database Schema Mismatch
```bash
/frappe bench migrate
```

### Build Errors
```bash
/frappe bench build --force
```

## Bench Commands Reference

Common bench operations via `/frappe bench`:

```bash
# Site management
/frappe bench new-site site1.local
/frappe bench use site1.local

# App management
/frappe bench get-app <app-name>
/frappe bench install-app <app-name>

# Database
/frappe bench migrate
/frappe bench restore

# Development
/frappe bench clear-cache
/frappe bench build
/frappe bench restart

# Testing
/frappe bench run-tests --app <app-name>
```

## Integration with Other Commands

- Use `/plan` first to design your Frappe app structure
- Use `/frappe` for Frappe-specific operations
- Use `/tdd` for test-driven DocType development
- Use `/code-review` to validate Frappe conventions
- Use `/build-fix` if bench build fails

## Related Resources

**Skills loaded:**
- All skills in `skills/frappe-*` directories

**Rules applied:**
- `rules/frappe-detect.md` - Auto-detection
- `rules/frappe-conventions.md` - Naming and structure
- `rules/frappe-security.md` - Security patterns
- `rules/frappe-testing.md` - Testing requirements

**Hooks active:**
- Python file formatting (Black/Ruff)
- DocType JSON validation
- Permission checks

## Notes

- The system auto-detects Frappe projects - no manual configuration needed
- All existing commands (`/plan`, `/tdd`, `/code-review`) become Frappe-aware
- Frappe patterns are only applied in detected Frappe projects
- Non-Frappe projects are unaffected

## Version Support

- **Frappe v14+** - Full support
- **Frappe v15** - Full support
- **ERPNext** - Compatible (built on Frappe)

For version-specific features, the system will detect and apply appropriate patterns.
