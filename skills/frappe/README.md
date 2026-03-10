# Frappe Framework Skills

Comprehensive skill collection for **Frappe Framework** development, covering full-stack patterns from backend Python to frontend JavaScript.

## Skill Organization

### Core Development

| Skill | Description | Use When |
|-------|-------------|----------|
| [architecture](architecture/) | App structure, bench, modules, hooks.py | Understanding Frappe project layout |
| [doctype-patterns](doctype-patterns/) | DocType controller patterns, lifecycle events | Writing DocType controllers |
| [api-patterns](api-patterns/) | REST/RPC API development with @frappe.whitelist() | Creating server APIs |

### Frontend (Client-Side)

| Skill | Description | Use When |
|-------|-------------|----------|
| [client-scripts](client-scripts/) | Form events, field manipulation, dialogs | Writing .js form scripts |
| [jinja-templates](jinja-templates/) | Template security, XSS prevention, CSRF | Creating .html templates |

### Backend (Server-Side)

| Skill | Description | Use When |
|-------|-------------|----------|
| [server-scripts](server-scripts/) | Controllers, whitelisted APIs, background jobs | Writing Python controllers |
| [testing](testing/) | Test patterns, fixtures, coverage requirements | Writing tests |
| [permissions](permissions/) | Role-based access control, permission checks | Implementing security |

### DevOps & Operations

| Skill | Description | Use When |
|-------|-------------|----------|
| [bench-usage](bench-usage/) | Bench commands, site management | Running bench operations |
| [migrations](migrations/) | Schema changes, data migrations, patches | Database updates |
| [deployment](deployment/) | Production deployment, SSL, backups | Going to production |

### Advanced Features

| Skill | Description | Use When |
|-------|-------------|----------|
| [workflows](workflows/) | Workflow engine, states, transitions | Building approval flows |
| [reports](reports/) | Query Reports, Script Reports, dashboards | Creating reports |
| [fixtures](fixtures/) | Data import/export, master data management | Managing fixtures |
| [performance](performance/) | Caching strategies, query optimization | Optimizing performance |

## Related Resources

**Security Rules** (in ~/.claude/rules/frappe/):
- `frappe-conventions.md` - Naming conventions, file organization
- `frappe-security.md` - Security patterns and mandatory checks
- `frappe-testing.md` - Testing requirements (80% coverage)
- `frappe-detect.md` - Auto-detection and framework integration

**Agent** (in ~/.claude/agents/):
- `frappe-reviewer.md` - Full-stack code reviewer (auto-invoked by `/code-review`)

## Quick Reference

### Common Patterns

**Python Controller:**
```python
import frappe
from frappe import _
from frappe.model.document import Document

class MyDocType(Document):
    def validate(self):
        self.validate_dates()
```

**Client Script:**
```javascript
frappe.ui.form.on('My DocType', {
    refresh: function(frm) {
        // Add custom button
    }
});
```

**Whitelisted API:**
```python
@frappe.whitelist()
def my_api_method(param):
    if not frappe.has_permission("DocType", "read"):
        frappe.throw(_("Not permitted"))
    return {"result": "data"}
```

**Jinja Template:**
```html
<div>{{ doc.name }}</div>
<form method="POST">
    <input type="hidden" name="csrf_token" value="{{ frappe.session.csrf_token }}">
</form>
```

## Getting Started

1. **New to Frappe?** Start with [architecture](architecture/)
2. **Building DocTypes?** Read [doctype-patterns](doctype-patterns/)
3. **Creating APIs?** Check [api-patterns](api-patterns/) and [server-scripts](server-scripts/)
4. **Frontend work?** Study [client-scripts](client-scripts/) and [jinja-templates](jinja-templates/)
5. **Security review?** Run `/code-review` (automatically uses frappe-reviewer agent)

## Auto-Detection

When you run `/code-review` in a Frappe project, the system automatically:
1. Detects Frappe via hooks.py, sites/, or frappe in requirements.txt
2. Invokes the **frappe-reviewer** agent
3. Reviews Python, JavaScript, JSON, and HTML files
4. Checks for SQL injection, XSS, permission issues, and more
5. Applies all patterns from these skills

## Framework Support

- **Frappe v14** - Full support
- **Frappe v15** - Full support
- **ERPNext** - Compatible (built on Frappe)

## Contributing

When adding new Frappe skills:
1. Create directory under `skills/frappe/`
2. Add `SKILL.md` with frontmatter (name, description)
3. Update this README.md
4. Reference from `frappe-reviewer.md` agent if security-critical
