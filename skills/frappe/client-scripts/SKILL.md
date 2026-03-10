---
name: frappe-client-scripts
description: Frappe client-side JavaScript patterns for form events, field manipulation, dialogs, and UI customization. Use when writing form scripts, handling field changes, creating dialogs, or customizing the Frappe desk interface.
---

# Frappe Client Scripts

Client-side JavaScript development patterns for Frappe Framework.

## When to Use

- Writing form scripts (`.js` files for DocTypes)
- Manipulating form fields (show/hide, require, read-only)
- Creating dialogs and prompts
- Making API calls from client (`frappe.call()`)
- Customizing list views
- Adding custom buttons
- Handling child table events

## Form Script Structure

```javascript
// doctype/my_doctype/my_doctype.js

frappe.ui.form.on('My DocType', {
    // LOAD EVENTS
    setup: function(frm) {
        // Called once when form is created
        // Use for: setting queries, initializing variables
    },

    refresh: function(frm) {
        // Called every time form refreshes
        // Use for: custom buttons, field toggles
        if (!frm.is_new()) {
            frm.add_custom_button(__('Action'), () => do_action(frm));
        }
    },

    // SAVE EVENTS
    validate: function(frm) {
        // Called before save - return false to prevent
        if (frm.doc.end_date < frm.doc.start_date) {
            frappe.msgprint(__('End Date cannot be before Start Date'));
            return false;
        }
    },

    // FIELD EVENTS
    customer: function(frm) {
        // Called when 'customer' field changes
        if (frm.doc.customer) {
            fetch_customer_details(frm);
        }
    }
});
```

## Field Manipulation

```javascript
// Show/hide
frm.toggle_display('fieldname', condition);

// Set read-only
frm.set_df_property('fieldname', 'read_only', 1);
frm.toggle_enable('fieldname', false);

// Set required
frm.toggle_reqd('fieldname', true);

// Set value (triggers events)
frm.set_value('fieldname', value);

// Set multiple values
frm.set_value({
    'field1': 'value1',
    'field2': 'value2'
});

// Refresh field after changes
frm.refresh_field('fieldname');
```

## Link Field Queries

```javascript
// Filter Link field options
frm.set_query('customer', function() {
    return {
        filters: {
            status: 'Active',
            customer_type: 'Company'
        }
    };
});

// Dynamic filters based on form values
frm.set_query('item_code', function() {
    return {
        filters: {
            item_group: frm.doc.item_group
        }
    };
});

// Filter in child table
frm.set_query('item_code', 'items', function(doc, cdt, cdn) {
    let row = locals[cdt][cdn];
    return {
        filters: {
            warehouse: row.warehouse
        }
    };
});
```

## Custom Buttons

```javascript
refresh: function(frm) {
    // Simple button
    frm.add_custom_button(__('Do Something'), function() {
        do_something(frm);
    });

    // Button in dropdown group
    frm.add_custom_button(__('Action 1'), function() {
        action_1(frm);
    }, __('Actions'));

    // Primary button (highlighted)
    frm.add_custom_button(__('Submit'), function() {
        submit_doc(frm);
    }).addClass('btn-primary');

    // Remove button
    frm.remove_custom_button(__('Do Something'));
}
```

## Child Table Operations

```javascript
// Child table events
frappe.ui.form.on('My DocType Item', {
    items_add: function(frm, cdt, cdn) {
        // Row added
        let row = locals[cdt][cdn];
        row.warehouse = frm.doc.default_warehouse;
        frm.refresh_field('items');
    },

    qty: function(frm, cdt, cdn) {
        // Field in row changes
        let row = locals[cdt][cdn];
        row.amount = flt(row.qty) * flt(row.rate);
        frm.refresh_field('items');
    }
});

// Add row
let row = frm.add_child('items', {
    item_code: 'ITEM-001',
    qty: 10
});
frm.refresh_field('items');

// Update row
frappe.model.set_value(cdt, cdn, 'fieldname', value);

// Iterate rows
frm.doc.items.forEach((item, idx) => {
    console.log(idx, item.item_code);
});
```

## API Calls

```javascript
// Basic call
frappe.call({
    method: 'my_app.api.get_data',
    args: {
        customer: frm.doc.customer
    },
    callback: function(r) {
        if (r.message) {
            frm.set_value('data', r.message);
        }
    }
});

// With loading indicator and error handling
frappe.call({
    method: 'my_app.api.process',
    args: { data: frm.doc },
    freeze: true,
    freeze_message: __('Processing...'),
    callback: function(r) {
        if (r.message) {
            frappe.show_alert({
                message: __('Success!'),
                indicator: 'green'
            });
        }
    },
    error: function(r) {
        frappe.msgprint({
            title: __('Error'),
            message: __('Failed to process'),
            indicator: 'red'
        });
    }
});

// Async/await
async function getData(frm) {
    const r = await frappe.call({
        method: 'my_app.api.get_data',
        args: { id: frm.doc.name }
    });
    return r.message;
}
```

## Dialogs

```javascript
// Simple prompt
frappe.prompt(
    {
        fieldname: 'reason',
        fieldtype: 'Small Text',
        label: __('Reason'),
        reqd: 1
    },
    function(values) {
        console.log(values.reason);
    },
    __('Enter Reason'),
    __('Submit')
);

// Multi-field dialog
let dialog = new frappe.ui.Dialog({
    title: __('Enter Details'),
    fields: [
        {
            fieldname: 'customer',
            fieldtype: 'Link',
            options: 'Customer',
            label: __('Customer'),
            reqd: 1
        },
        {
            fieldname: 'date',
            fieldtype: 'Date',
            label: __('Date'),
            default: frappe.datetime.nowdate()
        }
    ],
    primary_action_label: __('Submit'),
    primary_action: function(values) {
        console.log(values);
        dialog.hide();
        process_data(values);
    }
});

dialog.show();

// Confirmation
frappe.confirm(
    __('Are you sure?'),
    function() {
        // On Yes
        delete_record();
    }
);
```

## Messages & Alerts

```javascript
// Toast alert
frappe.show_alert({
    message: __('Success!'),
    indicator: 'green'  // green, blue, orange, red
}, 5);  // seconds

// Message dialog
frappe.msgprint({
    title: __('Information'),
    message: __('This is important'),
    indicator: 'blue'
});

// Error (stops execution)
frappe.throw(__('Cannot proceed'));
```

## Common Utilities

```javascript
// Date/Time
frappe.datetime.nowdate();           // "2024-01-15"
frappe.datetime.add_days("2024-01-15", 7);

// Formatting
flt(value);   // Float
cint(value);  // Integer
format_currency(1234.56, 'USD');

// Navigation
frappe.set_route('Form', 'Customer', 'CUST-001');
frappe.set_route('List', 'Customer');
frappe.new_doc('Customer');

// Translation
__('Translate this');
__('Hello {0}', [name]);
```

## Best Practices

**DO:**
- ✅ Use `frm.set_value()` to trigger events
- ✅ Wrap all user-facing text in `__()`
- ✅ Add error handling to `frappe.call()`
- ✅ Use `frm.refresh_field()` after updating child tables
- ✅ Debounce search operations
- ✅ Check for null/undefined before accessing fields

**DON'T:**
- ❌ Use `frm.doc.field = value` (doesn't trigger events)
- ❌ Forget to call `frm.refresh_field()` after child table changes
- ❌ Make API calls on every keystroke
- ❌ Use `innerHTML` with user data (XSS risk)
- ❌ Use hardcoded strings without translation
- ❌ Create global variables that leak

## Security Considerations

```javascript
// ❌ BAD: XSS vulnerability
frm.fields_dict.description.$wrapper.html(frm.doc.user_input);

// ✅ GOOD: Safe text rendering
frm.fields_dict.description.$wrapper.text(frm.doc.user_input);

// ✅ GOOD: Sanitized HTML
frm.fields_dict.description.$wrapper.html(
    frappe.utils.sanitize_html(frm.doc.user_input)
);
```

## Related

- [doctype-patterns](../doctype-patterns/SKILL.md) - Server-side controller patterns
- [api-patterns](../api-patterns/SKILL.md) - Creating whitelisted APIs
- [jinja-templates](../jinja-templates/SKILL.md) - Template rendering
- [server-scripts](../server-scripts/SKILL.md) - Python controller methods
