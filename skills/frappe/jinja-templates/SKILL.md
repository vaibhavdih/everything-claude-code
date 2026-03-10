---
name: frappe-jinja-templates
description: Frappe Jinja template patterns for web pages, email templates, print formats, and custom reports. Use when creating HTML templates with dynamic content, ensuring XSS prevention and proper CSRF protection.
---

# Frappe Jinja Templates

Jinja templating patterns for Frappe Framework web pages and email templates.

## When to Use

- Creating web pages (`.html` files in `www/` or `templates/`)
- Building email templates
- Designing print formats
- Custom reports with HTML output
- Rendering dynamic content

## Template Locations

```
my_app/
├── www/                    # Web pages (accessible via /my_app/page)
│   └── my_page.html
├── templates/              # Reusable templates
│   ├── includes/          # Partial templates
│   └── emails/            # Email templates
└── my_module/
    └── doctype/
        └── my_doctype/
            └── templates/  # DocType-specific templates
```

## Basic Template Structure

```html
<!-- www/my_page.html -->
{% extends "templates/web.html" %}

{% block title %}{{ _("My Page Title") }}{% endblock %}

{% block page_content %}
<div class="container">
    <h1>{{ _("Welcome") }}, {{ frappe.session.user }}</h1>

    {% if user_data %}
        <p>{{ user_data.name }}</p>
    {% else %}
        <p>{{ _("No data available") }}</p>
    {% endif %}
</div>
{% endblock %}
```

## Auto-Escaping (XSS Prevention)

**CRITICAL**: Jinja auto-escapes by default. Never use `| safe` with user input.

```html
<!-- ✅ GOOD: Auto-escaped (default) -->
<div>{{ user_comment }}</div>
<div>{{ doc.description }}</div>

<!-- ❌ BAD: Bypassing escaping (XSS vulnerability) -->
<div>{{ user_comment | safe }}</div>

<!-- ✅ GOOD: Explicit escape -->
<div>{{ frappe.utils.escape_html(user_input) }}</div>

<!-- ✅ GOOD: Safe HTML rendering (sanitized) -->
<div>{{ frappe.utils.md_to_html(markdown_content) | safe }}</div>
```

## Variable Access

```html
<!-- Session data -->
<p>Current User: {{ frappe.session.user }}</p>
<p>Full Name: {{ frappe.session.user_fullname }}</p>

<!-- DocType data -->
<h2>{{ doc.title }}</h2>
<p>Status: {{ doc.status }}</p>

<!-- Date formatting -->
<p>{{ frappe.utils.formatdate(doc.posting_date, "dd-MM-yyyy") }}</p>

<!-- Number formatting -->
<p>{{ frappe.utils.fmt_money(doc.total, currency=doc.currency) }}</p>
```

## Conditionals

```html
{% if doc.status == "Active" %}
    <span class="badge badge-success">{{ _("Active") }}</span>
{% elif doc.status == "Inactive" %}
    <span class="badge badge-danger">{{ _("Inactive") }}</span>
{% else %}
    <span class="badge badge-secondary">{{ _("Unknown") }}</span>
{% endif %}

<!-- Check for existence -->
{% if doc.email %}
    <a href="mailto:{{ doc.email }}">{{ doc.email }}</a>
{% endif %}
```

## Loops

```html
<!-- Iterate over list -->
<ul>
{% for item in items %}
    <li>{{ item.item_name }} - {{ item.qty }}</li>
{% endfor %}
</ul>

<!-- With index -->
<table>
{% for idx, row in enumerate(data, start=1) %}
    <tr>
        <td>{{ idx }}</td>
        <td>{{ row.name }}</td>
    </tr>
{% endfor %}
</table>

<!-- Empty state -->
<ul>
{% for item in items %}
    <li>{{ item.name }}</li>
{% else %}
    <li>{{ _("No items found") }}</li>
{% endfor %}
</ul>
```

## Includes

```html
<!-- Include partial template -->
{% include "templates/includes/header.html" %}

<!-- Include with variables -->
{% include "templates/includes/card.html" with context %}

<!-- Include and pass specific variables -->
{% with title="My Title", content="Content here" %}
    {% include "templates/includes/section.html" %}
{% endwith %}
```

## Forms & CSRF Protection

**CRITICAL**: Always include CSRF token in POST forms.

```html
<!-- ✅ GOOD: Form with CSRF protection -->
<form method="POST" action="/api/method/my_app.submit">
    <input type="hidden" name="csrf_token" value="{{ frappe.session.csrf_token }}">

    <div class="form-group">
        <label>{{ _("Name") }}</label>
        <input type="text" name="customer_name" class="form-control" required>
    </div>

    <button type="submit" class="btn btn-primary">{{ _("Submit") }}</button>
</form>

<!-- ❌ BAD: No CSRF token (security vulnerability) -->
<form method="POST" action="/api/method/my_app.submit">
    <!-- Missing CSRF token! -->
    <input type="text" name="customer_name">
</form>
```

## JavaScript in Templates

**CRITICAL**: Never use inline event handlers. Attach via JavaScript instead.

```html
<!-- ❌ BAD: Inline JavaScript (XSS risk) -->
<button onclick="deleteRecord('{{ doc.name }}')">{{ _("Delete") }}</button>

<!-- ✅ GOOD: Data attributes + external JS -->
<button class="btn-delete" data-name="{{ doc.name }}">{{ _("Delete") }}</button>

<script>
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const name = this.dataset.name;
            deleteRecord(name);
        });
    });
</script>

<!-- ✅ GOOD: Pass data to JavaScript safely -->
<script>
    const docData = {{ doc | tojson }};
    processData(docData);
</script>
```

## Translation

```html
<!-- Simple translation -->
<h1>{{ _("Welcome") }}</h1>

<!-- Translation with variables -->
<p>{{ _("Hello {0}, you have {1} messages", [user_name, message_count]) }}</p>

<!-- Pluralization -->
<p>{{ _("{0} item", "{0} items", item_count).format(item_count) }}</p>
```

## Email Templates

```html
<!-- templates/emails/order_confirmation.html -->
<div>
    <h2>{{ _("Order Confirmation") }}</h2>

    <p>{{ _("Dear") }} {{ customer_name }},</p>

    <p>{{ _("Your order {0} has been confirmed.", [order_id]) }}</p>

    <table>
        <thead>
            <tr>
                <th>{{ _("Item") }}</th>
                <th>{{ _("Qty") }}</th>
                <th>{{ _("Amount") }}</th>
            </tr>
        </thead>
        <tbody>
        {% for item in items %}
            <tr>
                <td>{{ item.item_name }}</td>
                <td>{{ item.qty }}</td>
                <td>{{ frappe.utils.fmt_money(item.amount, currency=currency) }}</td>
            </tr>
        {% endfor %}
        </tbody>
    </table>

    <p>{{ _("Total") }}: {{ frappe.utils.fmt_money(total, currency=currency) }}</p>

    <p>{{ _("Thank you for your business!") }}</p>
</div>
```

## Print Formats

```html
<!-- my_doctype/templates/my_doctype.html -->
<div class="print-format">
    <div class="print-heading">
        <h2>{{ doc.name }}</h2>
    </div>

    <div class="row">
        <div class="col-xs-6">
            <p><strong>{{ _("Customer") }}:</strong> {{ doc.customer_name }}</p>
            <p><strong>{{ _("Date") }}:</strong> {{ frappe.utils.formatdate(doc.posting_date) }}</p>
        </div>
        <div class="col-xs-6 text-right">
            <p><strong>{{ _("Status") }}:</strong> {{ doc.status }}</p>
        </div>
    </div>

    <table class="table table-bordered">
        <thead>
            <tr>
                <th>{{ _("#") }}</th>
                <th>{{ _("Item") }}</th>
                <th class="text-right">{{ _("Qty") }}</th>
                <th class="text-right">{{ _("Rate") }}</th>
                <th class="text-right">{{ _("Amount") }}</th>
            </tr>
        </thead>
        <tbody>
        {% for item in doc.items %}
            <tr>
                <td>{{ item.idx }}</td>
                <td>{{ item.item_name }}</td>
                <td class="text-right">{{ item.qty }}</td>
                <td class="text-right">{{ frappe.utils.fmt_money(item.rate) }}</td>
                <td class="text-right">{{ frappe.utils.fmt_money(item.amount) }}</td>
            </tr>
        {% endfor %}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="4" class="text-right"><strong>{{ _("Total") }}</strong></td>
                <td class="text-right"><strong>{{ frappe.utils.fmt_money(doc.total) }}</strong></td>
            </tr>
        </tfoot>
    </table>
</div>
```

## URL Construction

```html
<!-- ✅ GOOD: Safe URL construction -->
<a href="{{ frappe.utils.get_url() }}/app/customer/{{ doc.name }}">
    {{ _("View Customer") }}
</a>

<!-- ✅ GOOD: URL with query parameters -->
<a href="{{ frappe.utils.get_url() }}/api/method/my_app.download?file={{ frappe.utils.quote(doc.attachment) }}">
    {{ _("Download") }}
</a>

<!-- ❌ BAD: Hardcoded domain (not portable) -->
<a href="https://example.com/app/customer/{{ doc.name }}">Link</a>
```

## Filters

```html
<!-- Length -->
<p>{{ items | length }} items</p>

<!-- Default value -->
<p>{{ doc.description | default("No description") }}</p>

<!-- Upper/lower case -->
<p>{{ doc.name | upper }}</p>
<p>{{ doc.email | lower }}</p>

<!-- Join list -->
<p>{{ tags | join(", ") }}</p>

<!-- Format number -->
<p>{{ amount | round(2) }}</p>
```

## Macros

```html
<!-- Define macro -->
{% macro render_status(status) %}
    {% if status == "Active" %}
        <span class="badge badge-success">{{ status }}</span>
    {% else %}
        <span class="badge badge-secondary">{{ status }}</span>
    {% endif %}
{% endmacro %}

<!-- Use macro -->
{{ render_status(doc.status) }}
```

## Best Practices

**DO:**
- ✅ Use auto-escaping (default behavior)
- ✅ Always include CSRF token in POST forms
- ✅ Attach JavaScript event handlers externally
- ✅ Use `__(text)` for all user-facing text
- ✅ Use `frappe.utils.get_url()` for URL construction
- ✅ Format dates and currencies with Frappe utilities
- ✅ Use `{% include %}` for reusable components

**DON'T:**
- ❌ Use `| safe` with user-controlled content
- ❌ Use inline JavaScript event handlers
- ❌ Hardcode domain names in URLs
- ❌ Skip CSRF tokens in forms
- ❌ Expose sensitive data in templates
- ❌ Use raw HTML from user input

## Security Checklist

- [ ] No `| safe` filter on user input
- [ ] CSRF token in all POST forms
- [ ] No inline event handlers (`onclick`, `onload`, etc.)
- [ ] URLs constructed with `frappe.utils.get_url()`
- [ ] All user-facing text wrapped in `__()`
- [ ] Sensitive data not exposed in client-side templates
- [ ] JavaScript data passed via `{{ data | tojson }}`

## Common XSS Patterns to Avoid

```html
<!-- ❌ DANGEROUS: All of these are XSS vulnerabilities -->
<div>{{ user_bio | safe }}</div>
<script>var name = "{{ user_input }}";</script>
<div onclick="alert('{{ user_message }}')">Click</div>
<a href="{{ user_url }}">Link</a>

<!-- ✅ SAFE: Correct patterns -->
<div>{{ user_bio }}</div>  <!-- Auto-escaped -->
<script>var name = {{ user_input | tojson }};</script>
<div class="clickable" data-message="{{ user_message }}">Click</div>
<a href="{{ frappe.utils.validate_url(user_url) }}">Link</a>
```

## Related

- [client-scripts](../client-scripts/SKILL.md) - Client-side JavaScript patterns
- [server-scripts](../server-scripts/SKILL.md) - Server-side Python patterns
- [doctype-patterns](../doctype-patterns/SKILL.md) - DocType development
- **Security Rules**: ~/.claude/rules/frappe/frappe-security.md
