# Frappe Framework Detection

## Auto-Detection

The system automatically detects Frappe projects during `SessionStart` hook execution. When detected, Frappe-specific patterns, conventions, and skills are automatically applied.

## Detection Criteria

A project is identified as a Frappe project if ANY of the following conditions are met:

### Primary Indicators (Strong Signal)
1. **hooks.py file** exists in app directory
   - Contains Frappe app hooks configuration
   - Located in app root (e.g., `custom_app/hooks.py`)

2. **sites/ directory** exists with site configurations
   - Contains `apps.txt`, `site_config.json`
   - Indicates frappe-bench structure

3. **Frappe in dependencies**
   - `frappe` package in requirements.txt
   - `frappe` in pyproject.toml dependencies

### Secondary Indicators (Supporting Evidence)
4. **doctype/ directories** present in modules
5. **bench command** available in PATH
6. **apps.txt** file in project root
7. **.venv** or **env** with frappe installation

## Detection Flow

```
SessionStart Hook
    ↓
project-detect.js runs
    ↓
Checks for hooks.py + sites/ OR frappe in dependencies
    ↓
If found: Set framework="frappe"
    ↓
Output: Project type: {"languages":["python"],"frameworks":["frappe"],"primary":"frappe"}
    ↓
Frappe skills and rules automatically loaded
```

## When Frappe Patterns Apply

Once a Frappe project is detected, the following behaviors are activated:

### 1. Existing Commands Become Frappe-Aware

**`/plan` command:**
- Considers DocType structure and relationships
- Plans with Frappe modules and hooks
- Includes fixtures and permissions in phases
- References Frappe deployment patterns

**`/tdd` command:**
- Uses Frappe test patterns (`test_*.py`)
- Creates fixtures in proper format
- Uses `frappe.set_user()` for permission testing
- Runs tests with `bench run-tests`

**`/code-review` command:**
- Checks for SQL injection (raw `frappe.db.sql()`)
- Validates `@frappe.whitelist()` usage
- Ensures permission checks exist
- Reviews DocType controller patterns
- Validates proper error handling with `frappe.throw()`

**`/build-fix` command:**
- Recognizes bench build errors
- Suggests `bench build --force`
- Checks for missing dependencies in hooks.py
- Validates app installations

### 2. Frappe Skills Automatically Loaded

When Frappe is detected, these skills become available:

**Core Skills:**
- `frappe-architecture` - App structure, bench, modules
- `frappe-doctype-patterns` - DocType development
- `frappe-api-patterns` - REST/RPC APIs
- `frappe-testing` - Test patterns
- `frappe-bench-usage` - Bench commands
- `frappe-permissions` - Role-based access

**Advanced Skills:**
- `frappe-workflows` - Workflow engine
- `frappe-reports` - Query/Script reports
- `frappe-fixtures` - Data management
- `frappe-performance` - Optimization
- `frappe-migrations` - Schema changes
- `frappe-deployment` - Production setup

### 3. Frappe Rules Enforced

**Conventions (`frappe-conventions.md`):**
- DocType names: PascalCase
- Field names: snake_case
- Method names: snake_case
- Module names: Title Case With Spaces

**Security (`frappe-security.md`):**
- Mandatory permission checks
- SQL injection prevention
- XSS protection
- CSRF enabled

**Testing (`frappe-testing.md`):**
- 80% coverage minimum
- Fixture-based test data
- Permission testing
- Integration tests

### 4. Context-Specific Behavior

**When creating files:**
- DocType JSON: Validates schema
- Python controllers: Adds import statements
- JS files: Uses Frappe API patterns
- Test files: Uses Frappe test base class

**When suggesting code:**
- Uses `frappe.db.get_value()` over raw SQL
- Adds `@frappe.whitelist()` for APIs
- Includes permission checks
- Uses `frappe.throw()` for errors

## Detection Override

Users can manually override detection in `~/.claude/settings.json`:

```json
{
  "projectType": {
    "force": "frappe",
    "version": "15"
  }
}
```

Or disable Frappe patterns:

```json
{
  "projectType": {
    "excludeFrameworks": ["frappe"]
  }
}
```

## Non-Frappe Projects

**IMPORTANT**: Frappe patterns are ONLY applied when a Frappe project is detected. If no Frappe indicators are found:
- Generic Python patterns apply
- No Frappe-specific skills loaded
- Standard code review rules apply
- No bench command suggestions

This ensures non-Frappe Python projects (Django, Flask, FastAPI) remain unaffected.

## Detection Logging

During SessionStart, you'll see:

```
[SessionStart] Project detected — languages: python; frameworks: frappe
Project type: {"languages":["python"],"frameworks":["frappe"],"primary":"frappe","projectDir":"/Users/user/frappe-bench/apps/custom_app"}
```

This confirms Frappe detection and activates all Frappe-specific features.

## Troubleshooting Detection

### Frappe Not Detected

**Symptoms:**
- Generic Python patterns apply
- No Frappe skills available
- `/frappe` command not working

**Solutions:**
1. Verify `hooks.py` exists in app directory
2. Check if `sites/` directory exists in bench
3. Ensure `frappe` is in requirements.txt
4. Manually set in settings.json (see Detection Override)

### False Positive Detection

**Symptoms:**
- Frappe patterns applied to non-Frappe project

**Solutions:**
1. Remove hooks.py if not a Frappe app
2. Exclude frappe in settings.json
3. Report issue if detection criteria are wrong

## Detection Examples

### Example 1: frappe-bench Structure
```
frappe-bench/
├── apps/
│   └── custom_app/
│       ├── hooks.py           ← Detected
│       ├── custom_app/
│       │   └── modules.txt
│       └── requirements.txt
├── sites/                     ← Detected
│   └── site1.local/
└── env/
```
**Result**: ✅ Frappe detected

### Example 2: Standalone Frappe App
```
my-frappe-app/
├── hooks.py                   ← Detected
├── my_frappe_app/
│   └── modules.txt
└── requirements.txt           ← Contains "frappe"
```
**Result**: ✅ Frappe detected

### Example 3: Django Project
```
django-project/
├── manage.py
├── myapp/
│   ├── models.py
│   └── views.py
└── requirements.txt           ← No "frappe"
```
**Result**: ❌ Frappe NOT detected (Django detected instead)

## Integration with Other Frameworks

If multiple frameworks are detected (e.g., Frappe + custom Node.js frontend), the system applies appropriate patterns based on file context:

- `.py` files in Frappe app → Frappe patterns
- `.js` files in frontend/ → React/Vue patterns
- API calls → Frappe REST API patterns

## Performance Impact

Frappe detection runs once at session start and has minimal overhead:
- File existence checks: ~10ms
- Dependency parsing: ~50ms
- Skill loading: Lazy (loaded when needed)

Total detection time: <100ms

## Future Enhancements

Planned detection improvements:
- Frappe version detection (v14 vs v15)
- ERPNext detection (built on Frappe)
- Custom app detection
- Multi-bench support
