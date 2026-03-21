# Frappe Utilities Skills

A collection of reference skills documenting Frappe framework utilities organized by category. Use these to **reuse existing functions** instead of writing code from scratch.

## 📚 Skills in This Collection

### 1. [Common Utilities](common-utilities.md) - **Start Here! ⭐**
Quick lookup guide for the most frequently used utilities.
- Task-based navigation ("I need to validate input")
- Import paths and common patterns
- Performance tips
- When to use each skill

**Read this first** to get oriented.

---

### 2. [Validation Utilities](validation-utilities.md)
Frappe's built-in validation functions for user input.

**Contains:**
- Email validation: `validate_email_address()`
- Phone validation: `validate_phone_number_with_country_code()`
- Date validation: `getdate()`, `is_invalid_date_string()`
- HTML sanitization: `sanitize_html()`
- Person name, URL validation
- Pre-compiled regex patterns

**When to use:**
- Implementing validation in DocType controllers
- Building custom API endpoints with input validation
- Creating forms with server-side validation

---

### 3. [Database Utilities](database-utilities.md)
Safe, efficient database query and manipulation functions.

**Contains:**
- Get single value: `frappe.get_value()`
- Get list: `frappe.get_all()` (safe, SQL injection proof)
- Count: `frappe.db.count()`
- Update: `frappe.db.set_value()`, `frappe.db.update()`
- Transactions: `frappe.db.transaction()`
- Type conversion: `cint()`, `flt()`, `cstr()`
- Raw SQL (parameterized): Safe query patterns

**When to use:**
- Querying database in DocType methods
- Building API endpoints that fetch/modify data
- Performing batch updates
- Writing database-related tests

**Critical:** Always use these instead of raw SQL strings to prevent SQL injection.

---

### 4. [Formatting Utilities](formatting-utilities.md)
Display and formatting functions for user-facing output.

**Contains:**
- Date formatting: `format_date()`, `format_datetime()`, `format_time()`
- Currency formatting: `format_currency()`, `fmt_money()`
- Number formatting: `format_number()`
- User info: `get_fullname()`, `get_formatted_email()`, `extract_email_id()`
- Text formatting: `html_to_text()`, `truncate()`, `slugify()`
- Markdown conversion

**When to use:**
- Building report columns
- Creating email templates
- Displaying data in forms and list views
- Converting database values for API responses

---

### 5. [API Utilities](api-utilities.md)
Functions for building REST/RPC API endpoints in Frappe.

**Contains:**
- Endpoint creation: `@frappe.whitelist()`
- Permission checking: `frappe.has_permission()`
- Error handling: `frappe.throw()`, `frappe.log_error()`
- Rate limiting: `@frappe.rate_limit()`
- Request handling: `frappe.get_arg()`, `frappe.request`
- Response formatting
- Pagination patterns

**When to use:**
- Building REST/RPC API endpoints
- Implementing webhooks or integrations
- Handling API errors and responses
- Implementing rate limiting

---

## 🔄 How to Use During Development

### Step 1: Check Common Utilities First
Open [common-utilities.md](common-utilities.md) and use the task-based table to find your use case.

### Step 2: Go to Specific Skill
Jump to the detailed skill file recommended in common utilities.

### Step 3: Copy-Paste Examples
Each function includes real-world code examples you can adapt.

### Step 4: Code with Confidence
You're using battle-tested Frappe utilities instead of reinventing.

---

## 📋 Quick Integration Guide

### During `/plan` Command
- Reviewplanner should mention available utilities
- Example: "Can use `frappe.get_all()` instead of raw SQL"

### During `/tdd` Command
- Before writing tests: Check related utility skill
- Example: "Test validation? Use `validate_email_address()` examples"

### During `/code-review` Command
- Reviewer checks if developer used utilities or reinvented
- Example: "Used str(amount) instead of `format_currency()`?"

### During Implementation
- Keep one skill file open in IDE tab
- Search (Ctrl+F) for the function you need
- Copy example, adapt to your case

---

## 🎯 Common Development Tasks & Utility Skills

| Task | Reference Skill | Key Function |
|------|-----------------|--------------|
| Validate customer email | Validation | `validate_email_address()` |
| Validate international phone | Validation | `validate_phone_number_with_country_code()` |
| Parse date from user input | Validation | `getdate()` |
| Sanitize user-provided HTML | Validation | `sanitize_html()` |
| Fetch single customer | Database | `frappe.get_value()` |
| Fetch list with filters | Database | `frappe.get_all()` |
| Count matching records | Database | `frappe.db.count()` |
| Update single field | Database | `frappe.db.set_value()` |
| Batch update records | Database | `frappe.db.update()` |
| Multiple related operations | Database | `frappe.db.transaction()` |
| Convert to integer safely | Database | `cint()` |
| Display date in UI | Formatting | `format_date()` |
| Display currency in report | Formatting | `format_currency()` |
| Display user full name | Formatting | `get_fullname()` |
| Create API endpoint | API | `@frappe.whitelist()` |
| Check API permission | API | `frappe.has_permission()` |
| Return API error | API | `frappe.throw()` |
| Rate limit public API | API | `@frappe.rate_limit()` |

---

## 🚀 Pro Tips

### Tip 1: Bookmark in IDE
Add these skills to IDE favorites for instant access while coding.

### Tip 2: Keep Tab Open
During development, keep the relevant skill file open in a tab.

### Tip 3: Use IDE Search
Press Ctrl+F to search within skill file for specific function names.

### Tip 4: Copy Full Examples
Don't just copy function calls - copy complete code examples that show error handling.

### Tip 5: Check Performance Section
Each skill has "Best Practices" and "Performance Tips" - read these before coding.

---

## 📖 File Organization

```
skills/frappe/utilities/
├── README.md                    # This file - overview and navigation
├── common-utilities.md          # Task-based quick reference (START HERE)
├── validation-utilities.md      # Email, phone, date, HTML validation
├── database-utilities.md        # Queries, updates, transactions
├── formatting-utilities.md      # Date, currency, number formatting
└── api-utilities.md             # Endpoints, permissions, rate limiting
```

---

## 🔐 Security Note

These utilities handle critical security concerns:
- **SQL Injection:** Database utilities use parameterization
- **XSS Prevention:** `sanitize_html()` prevents malicious scripts
- **Validation:** All input should be validated before use
- **Permissions:** Every API must check permissions
- **Rate Limiting:** Public APIs should be rate-limited

**Always use these utilities - they have security built in.**

---

## 📚 Related Documentation

- **Frappe Conventions** - Naming and file organization
- **Frappe Security Rules** - Security checklist and requirements
- **Frappe Testing** - TDD methodology with 80% coverage
- **Frappe Deployment** - Production setup and best practices

---

## 🎓 Learning Path

**Beginner:**
1. Read [Common Utilities](common-utilities.md) - overview
2. Pick your first task (validate email? query data?)
3. Go to relevant skill file
4. Copy-adapt example code

**Intermediate:**
1. Reference multiple skills per task
2. Combine utilities for complex logic
3. Understand error handling patterns
4. Check performance tips

**Advanced:**
1. Contribute new utility examples
2. Optimize query patterns
3. Build reusable API patterns
4. Mentor others on utility usage

---

## ❓ FAQ

**Q: Where is `frappe.utils.validate_email_address()`?**
A: See [Validation Utilities → Email Validation](validation-utilities.md#email-validation)

**Q: How do I safely query the database?**
A: See [Database Utilities → Data Retrieval](database-utilities.md#critical-always-use-these---never-raw-sql-string-formatting)

**Q: How do I format currency in a report?**
A: See [Formatting Utilities → Currency](formatting-utilities.md#currency--money-formatting)

**Q: How do I create an API endpoint?**
A: See [API Utilities → Whitelisting](api-utilities.md#whitelisting--api-definition)

**Q: Why can't I use raw SQL?**
A: SQL injection risk. Always use parameterized queries from [Database Utilities](database-utilities.md).

---

## 🤝 Contributing

Found a missing utility? Want to add examples?
- All skills are markdown files
- Follow existing format with examples
- Include copy-paste ready code
- Add security notes where relevant

---

## ✅ Checklist: Before You Code

- [ ] Opened [Common Utilities](common-utilities.md)
- [ ] Found your task in the table
- [ ] Opened relevant skill file
- [ ] Read the "When to use" section
- [ ] Copied relevant example
- [ ] Understood error handling
- [ ] Checked "Best Practices"
- [ ] Ready to code with confidence

**Start here:** [Common Utilities](common-utilities.md)