---
name: frappe-workflows
description: Frappe workflow engine - states, transitions, actions, approval processes, and automated workflow patterns.
origin: ECC
---

# Frappe Workflows

Guide to implementing approval workflows and state machines in Frappe.

## When to Activate

- Implementing approval processes
- Building state machines
- Creating multi-step workflows
- Managing document lifecycle
- Automating business processes

## Workflow Concepts

### Components

1. **Workflow States** - Different stages (Draft, Pending, Approved)
2. **Transitions** - Allowed movements between states
3. **Workflow Actions** - Buttons that trigger transitions
4. **Roles** - Who can perform which transitions
5. **Conditions** - Rules for when transitions are allowed

### Workflow Structure

```
[Draft] --Submit--> [Pending Approval] --Approve--> [Approved]
                           |
                           +--Reject--> [Rejected]
```

## Creating Workflows

### 1. Define Workflow States

Create via: Setup > Workflow > Workflow State

```json
{
    "doctype": "Workflow State",
    "workflow_state_name": "Draft",
    "style": "Primary"  // Color: Primary, Success, Warning, Danger, Info
}
```

Common states:
- Draft (Primary)
- Pending Review (Warning)
- Pending Approval (Warning)
- Approved (Success)
- Rejected (Danger)
- Cancelled (Danger)

### 2. Create Workflow

Setup > Workflow > Workflow

```python
workflow = frappe.get_doc({
    "doctype": "Workflow",
    "workflow_name": "Purchase Order Approval",
    "document_type": "Purchase Order",
    "workflow_state_field": "workflow_state",  # Field in DocType
    "is_active": 1,
    "send_email_alert": 1,

    # States
    "states": [
        {
            "state": "Draft",
            "doc_status": 0,  # 0=Draft, 1=Submitted, 2=Cancelled
            "allow_edit": "Purchasing User",
            "update_field": "workflow_state",
            "update_value": "Draft"
        },
        {
            "state": "Pending Approval",
            "doc_status": 0,
            "allow_edit": "Purchasing Manager",
            "update_field": "workflow_state",
            "update_value": "Pending Approval"
        },
        {
            "state": "Approved",
            "doc_status": 1,
            "allow_edit": "",  # No editing after approval
            "update_field": "workflow_state",
            "update_value": "Approved"
        }
    ],

    # Transitions
    "transitions": [
        {
            "state": "Draft",
            "action": "Submit for Approval",
            "next_state": "Pending Approval",
            "allowed": "Purchasing User",
            "allow_self_approval": 0
        },
        {
            "state": "Pending Approval",
            "action": "Approve",
            "next_state": "Approved",
            "allowed": "Purchasing Manager",
            "allow_self_approval": 0
        },
        {
            "state": "Pending Approval",
            "action": "Reject",
            "next_state": "Draft",
            "allowed": "Purchasing Manager",
            "allow_self_approval": 1
        }
    ]
}).insert()
```

### 3. Add Workflow State Field to DocType

```json
// In purchase_order.json
{
    "fields": [
        {
            "fieldname": "workflow_state",
            "fieldtype": "Link",
            "label": "Workflow State",
            "options": "Workflow State",
            "hidden": 1
        }
    ]
}
```

## Workflow Patterns

### Simple Approval Workflow

```
Draft → Pending → Approved
         ↓
      Rejected
```

```python
workflow = {
    "workflow_name": "Leave Application Approval",
    "document_type": "Leave Application",

    "states": [
        {"state": "Draft", "doc_status": 0, "allow_edit": "Employee"},
        {"state": "Pending", "doc_status": 0, "allow_edit": "HR Manager"},
        {"state": "Approved", "doc_status": 1, "allow_edit": ""},
        {"state": "Rejected", "doc_status": 2, "allow_edit": ""}
    ],

    "transitions": [
        {
            "state": "Draft",
            "action": "Submit",
            "next_state": "Pending",
            "allowed": "Employee"
        },
        {
            "state": "Pending",
            "action": "Approve",
            "next_state": "Approved",
            "allowed": "HR Manager"
        },
        {
            "state": "Pending",
            "action": "Reject",
            "next_state": "Rejected",
            "allowed": "HR Manager"
        }
    ]
}
```

### Multi-Level Approval

```
Draft → Manager Review → Director Review → Approved
          ↓                    ↓
        Rejected            Rejected
```

```python
workflow = {
    "workflow_name": "Expense Claim Approval",
    "document_type": "Expense Claim",

    "states": [
        {"state": "Draft", "allow_edit": "Employee"},
        {"state": "Manager Review", "allow_edit": "Manager"},
        {"state": "Director Review", "allow_edit": "Director"},
        {"state": "Approved", "allow_edit": ""},
        {"state": "Rejected", "allow_edit": ""}
    ],

    "transitions": [
        {"state": "Draft", "action": "Submit", "next_state": "Manager Review", "allowed": "Employee"},
        {"state": "Manager Review", "action": "Approve", "next_state": "Director Review", "allowed": "Manager"},
        {"state": "Manager Review", "action": "Reject", "next_state": "Rejected", "allowed": "Manager"},
        {"state": "Director Review", "action": "Approve", "next_state": "Approved", "allowed": "Director"},
        {"state": "Director Review", "action": "Reject", "next_state": "Rejected", "allowed": "Director"}
    ]
}
```

### Conditional Workflow (Amount-Based)

```python
# In expense_claim.py
def validate(self):
    """Set workflow based on amount"""
    if self.total_amount > 10000:
        # Requires director approval
        self.workflow_name = "High Value Expense Approval"
    else:
        # Manager approval sufficient
        self.workflow_name = "Standard Expense Approval"
```

### Parallel Approval

```
Draft → [Manager Approval + Finance Approval] → Approved
```

```python
workflow = {
    "workflow_name": "Contract Approval",
    "document_type": "Contract",

    "states": [
        {"state": "Draft"},
        {"state": "Manager Pending"},
        {"state": "Manager Approved"},
        {"state": "Finance Pending"},
        {"state": "Finance Approved"},
        {"state": "Fully Approved"}
    ],

    "transitions": [
        {"state": "Draft", "action": "Submit", "next_state": "Manager Pending"},
        {"state": "Manager Pending", "action": "Manager Approve", "next_state": "Manager Approved", "allowed": "Manager"},
        {"state": "Manager Approved", "action": "Send to Finance", "next_state": "Finance Pending"},
        {"state": "Finance Pending", "action": "Finance Approve", "next_state": "Fully Approved", "allowed": "Finance Manager"}
    ]
}
```

## Workflow in Code

### Programmatic State Change

```python
def change_workflow_state(doc, new_state):
    """Change workflow state programmatically"""

    # Check if transition is allowed
    workflow = frappe.get_doc("Workflow", {"document_type": doc.doctype})

    valid_transition = False
    for transition in workflow.transitions:
        if transition.state == doc.workflow_state and transition.next_state == new_state:
            valid_transition = True
            break

    if not valid_transition:
        frappe.throw(f"Cannot transition from {doc.workflow_state} to {new_state}")

    # Update state
    doc.workflow_state = new_state
    doc.save()

    # Log transition
    frappe.get_doc({
        "doctype": "Workflow Action",
        "reference_doctype": doc.doctype,
        "reference_name": doc.name,
        "workflow_state": new_state,
        "user": frappe.session.user
    }).insert()
```

### Workflow Hooks

```python
# In hooks.py
doc_events = {
    "Purchase Order": {
        "on_update_after_submit": "myapp.workflows.on_po_update",
        "before_workflow_action": "myapp.workflows.validate_po_workflow"
    }
}

# In workflows.py
def validate_po_workflow(doc, action):
    """Custom validation before workflow action"""

    if action == "Approve":
        # Check if all items have prices
        for item in doc.items:
            if not item.rate:
                frappe.throw(f"Item {item.item_code} has no rate")

        # Check budget
        if doc.grand_total > get_available_budget(doc.cost_center):
            frappe.throw("Exceeds budget")

def on_po_update(doc, method):
    """Actions after workflow state change"""

    if doc.workflow_state == "Approved":
        # Create stock reservation
        create_stock_reservation(doc)

        # Notify supplier
        send_po_to_supplier(doc)
```

### Get Workflow Actions for User

```python
def get_available_actions(doc):
    """Get workflow actions available to current user"""

    if not doc.workflow_state:
        return []

    workflow = frappe.get_doc("Workflow", {"document_type": doc.doctype})

    actions = []
    for transition in workflow.transitions:
        if transition.state == doc.workflow_state:
            # Check if user has allowed role
            if transition.allowed in frappe.get_roles():
                actions.append({
                    "action": transition.action,
                    "next_state": transition.next_state
                })

    return actions
```

## Email Alerts

### Configure Workflow Alerts

```python
# Create email alert for workflow state change
alert = frappe.get_doc({
    "doctype": "Email Alert",
    "name": "Purchase Order - Pending Approval",
    "document_type": "Purchase Order",
    "event": "Value Change",
    "value_changed": "workflow_state",
    "enabled": 1,
    "send_alert_on": "Value Change",

    # Condition
    "condition": "doc.workflow_state == 'Pending Approval'",

    # Recipients
    "recipients": [
        {"receiver_by_role": "Purchasing Manager"}
    ],

    # Message
    "subject": "Purchase Order {{doc.name}} Pending Your Approval",
    "message": """
        Dear {{recipient}},

        Purchase Order {{doc.name}} is pending your approval.

        Amount: {{doc.grand_total}}
        Supplier: {{doc.supplier}}

        Please review and approve.

        Thank you.
    """
}).insert()
```

## Client-Side Workflow

### Custom Workflow Buttons

```javascript
// purchase_order.js
frappe.ui.form.on('Purchase Order', {
    refresh: function(frm) {
        if (frm.doc.workflow_state === 'Pending Approval') {
            // Add custom approve button
            frm.add_custom_button(__('Quick Approve'), () => {
                frappe.call({
                    method: 'myapp.api.quick_approve_po',
                    args: {
                        po: frm.doc.name
                    },
                    callback: (r) => {
                        frm.reload_doc();
                        frappe.show_alert('Purchase Order Approved');
                    }
                });
            });
        }
    }
});
```

### Show Workflow History

```javascript
frappe.ui.form.on('Purchase Order', {
    refresh: function(frm) {
        // Show workflow history
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Workflow Action',
                filters: {
                    reference_doctype: frm.doctype,
                    reference_name: frm.doc.name
                },
                fields: ['user', 'workflow_state', 'creation'],
                order_by: 'creation desc'
            },
            callback: (r) => {
                if (r.message) {
                    display_workflow_history(frm, r.message);
                }
            }
        });
    }
});

function display_workflow_history(frm, history) {
    let html = '<table class="table table-bordered">';
    html += '<tr><th>User</th><th>State</th><th>Date</th></tr>';

    history.forEach(h => {
        html += `<tr>
            <td>${h.user}</td>
            <td>${h.workflow_state}</td>
            <td>${h.creation}</td>
        </tr>`;
    });

    html += '</table>';

    frm.set_df_property('workflow_history_html', 'options', html);
}
```

## Advanced Patterns

### Auto-Approval Based on Amount

```python
# In purchase_order.py
def validate(self):
    """Auto-approve small orders"""

    if self.workflow_state == "Pending Approval" and self.grand_total < 1000:
        # Auto-approve
        self.workflow_state = "Approved"
        self.docstatus = 1

        frappe.msgprint("Auto-approved (amount below threshold)")
```

### Escalation Workflow

```python
# In scheduler (hooks.py)
scheduler_events = {
    "hourly": [
        "myapp.workflows.escalate_pending_approvals"
    ]
}

def escalate_pending_approvals():
    """Escalate approvals pending for > 24 hours"""

    from frappe.utils import add_days, now_datetime

    threshold = add_days(now_datetime(), -1)

    pending_orders = frappe.get_all("Purchase Order",
        filters={
            "workflow_state": "Pending Approval",
            "modified": ["<", threshold]
        }
    )

    for order in pending_orders:
        # Escalate to director
        doc = frappe.get_doc("Purchase Order", order.name)
        doc.workflow_state = "Director Review"
        doc.add_comment("Comment", "Escalated due to no action for 24 hours")
        doc.save()

        # Notify director
        send_escalation_email(doc)
```

### Delegation Workflow

```python
def delegate_approval(doc, delegate_to):
    """Allow user to delegate approval to another user"""

    # Check if current user can approve
    if not can_approve(doc, frappe.session.user):
        frappe.throw("You cannot approve this document")

    # Set delegate
    doc.delegate_to = delegate_to
    doc.save()

    # Notify delegate
    frappe.sendmail(
        recipients=[delegate_to],
        subject=f"Approval Delegated: {doc.name}",
        message=f"{frappe.session.user} has delegated approval of {doc.name} to you"
    )
```

## Best Practices

**DO:**
- ✅ Keep workflows simple (3-5 states max)
- ✅ Use descriptive state names
- ✅ Document workflow requirements
- ✅ Test all transition paths
- ✅ Send notifications at each state
- ✅ Log all workflow actions
- ✅ Consider edge cases (escalation, delegation)
- ✅ Allow workflow bypass for admins

**DON'T:**
- ❌ Create overly complex workflows
- ❌ Allow circular transitions
- ❌ Skip validation in workflow actions
- ❌ Hardcode workflow logic in controllers
- ❌ Forget to handle rejection scenarios
- ❌ Ignore audit trail
- ❌ Allow self-approval by default

## Testing Workflows

```python
class TestPurchaseOrderWorkflow(unittest.TestCase):
    """Test purchase order workflow"""

    def test_submit_for_approval(self):
        """Test submitting PO for approval"""
        po = make_test_po()

        self.assertEqual(po.workflow_state, "Draft")

        # Submit for approval
        frappe.set_user("purchasing.user@test.com")
        po.workflow_state = "Pending Approval"
        po.save()

        self.assertEqual(po.workflow_state, "Pending Approval")

    def test_manager_approval(self):
        """Test manager approving PO"""
        po = make_test_po(workflow_state="Pending Approval")

        # Approve as manager
        frappe.set_user("purchasing.manager@test.com")
        po.workflow_state = "Approved"
        po.docstatus = 1
        po.save()

        self.assertEqual(po.workflow_state, "Approved")
        self.assertEqual(po.docstatus, 1)

    def test_invalid_transition(self):
        """Test that invalid transitions are prevented"""
        po = make_test_po()

        # Try to approve directly from draft (should fail)
        with self.assertRaises(frappe.ValidationError):
            po.workflow_state = "Approved"
            po.save()
```

## Next Steps

- Build reports → `frappe-reports`
- Manage data → `frappe-fixtures`
- Optimize performance → `frappe-performance`
- Handle migrations → `frappe-migrations`
