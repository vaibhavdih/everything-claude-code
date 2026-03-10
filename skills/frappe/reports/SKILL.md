---
name: frappe-reports
description: Frappe reporting - Query Reports, Script Reports, dashboards, charts, and data visualization patterns.
origin: ECC
---

# Frappe Reports

Guide to building reports, dashboards, and data visualizations in Frappe.

## When to Activate

- Creating business reports
- Building dashboards
- Generating analytics
- Exporting data
- Visualizing metrics

## Report Types

### 1. Report Builder (No Code)

Simple reports via UI: Setup > Report Builder

- Point and click interface
- Filter DocType fields
- Basic aggregations
- Export to Excel/CSV

### 2. Query Report (SQL-Based)

Custom SQL queries with filters and charts.

### 3. Script Report (Python-Based)

Full Python logic for complex calculations.

### 4. Custom Reports (DocType-Based)

Reports that are DocTypes themselves.

## Query Reports

### Basic Query Report

```python
# File: sales_report/sales_report.py

import frappe
from frappe import _

def execute(filters=None):
    """Execute report

    Args:
        filters (dict): Report filters from user

    Returns:
        tuple: (columns, data)
    """
    columns = get_columns()
    data = get_data(filters)

    return columns, data

def get_columns():
    """Define report columns"""
    return [
        {
            "fieldname": "customer",
            "label": _("Customer"),
            "fieldtype": "Link",
            "options": "Customer",
            "width": 150
        },
        {
            "fieldname": "total_sales",
            "label": _("Total Sales"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "order_count",
            "label": _("Orders"),
            "fieldtype": "Int",
            "width": 80
        }
    ]

def get_data(filters):
    """Fetch report data"""

    # Build conditions
    conditions = []
    if filters.get("from_date"):
        conditions.append(f"so.transaction_date >= '{filters.get('from_date')}'")
    if filters.get("to_date"):
        conditions.append(f"so.transaction_date <= '{filters.get('to_date')}'")
    if filters.get("customer"):
        conditions.append(f"so.customer = '{filters.get('customer')}'")

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # Execute query
    data = frappe.db.sql(f"""
        SELECT
            so.customer,
            SUM(so.grand_total) as total_sales,
            COUNT(*) as order_count
        FROM `tabSales Order` so
        WHERE {where_clause}
        GROUP BY so.customer
        ORDER BY total_sales DESC
    """, as_dict=True)

    return data
```

### Query Report JSON Configuration

```javascript
// sales_report.json
{
    "add_total_row": 1,
    "columns": [],
    "creation": "2024-01-01 00:00:00",
    "disable_prepared_report": 0,
    "disabled": 0,
    "docstatus": 0,
    "doctype": "Report",
    "filters": [
        {
            "fieldname": "from_date",
            "fieldtype": "Date",
            "label": "From Date",
            "mandatory": 1,
            "wildcard_filter": 0
        },
        {
            "fieldname": "to_date",
            "fieldtype": "Date",
            "label": "To Date",
            "mandatory": 1,
            "wildcard_filter": 0
        },
        {
            "fieldname": "customer",
            "fieldtype": "Link",
            "label": "Customer",
            "mandatory": 0,
            "options": "Customer",
            "wildcard_filter": 0
        }
    ],
    "is_standard": "Yes",
    "letter_head": "Standard",
    "name": "Sales Report",
    "ref_doctype": "Sales Order",
    "report_name": "Sales Report",
    "report_type": "Query Report",
    "roles": [
        {
            "role": "Sales Manager"
        },
        {
            "role": "Sales User"
        }
    ]
}
```

### Query Report with Charts

```python
def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    chart = get_chart_data(data)

    return columns, data, None, chart

def get_chart_data(data):
    """Return chart configuration"""

    return {
        "data": {
            "labels": [d.customer for d in data[:10]],  # Top 10
            "datasets": [{
                "name": "Total Sales",
                "values": [d.total_sales for d in data[:10]]
            }]
        },
        "type": "bar",
        "colors": ["#7cd6fd"],
        "height": 300
    }
```

## Script Reports

### Basic Script Report

```python
# File: customer_analysis/customer_analysis.py

import frappe
from frappe import _
from frappe.utils import flt

def execute(filters=None):
    """Customer analysis report"""

    columns = get_columns()
    data = get_data(filters)
    summary = get_summary(data)

    return columns, data, None, None, summary

def get_columns():
    return [
        {"label": _("Customer"), "fieldname": "customer", "fieldtype": "Link", "options": "Customer", "width": 200},
        {"label": _("Revenue"), "fieldname": "revenue", "fieldtype": "Currency", "width": 120},
        {"label": _("Orders"), "fieldname": "orders", "fieldtype": "Int", "width": 80},
        {"label": _("Avg Order"), "fieldname": "avg_order", "fieldtype": "Currency", "width": 120},
        {"label": _("Last Order"), "fieldname": "last_order", "fieldtype": "Date", "width": 100}
    ]

def get_data(filters):
    """Fetch and process data"""

    customers = frappe.get_all("Sales Order",
        filters=get_filter_conditions(filters),
        fields=[
            "customer",
            "SUM(grand_total) as revenue",
            "COUNT(*) as orders",
            "MAX(transaction_date) as last_order"
        ],
        group_by="customer",
        order_by="revenue DESC"
    )

    # Calculate average order value
    for customer in customers:
        customer["avg_order"] = flt(customer["revenue"]) / flt(customer["orders"])

    return customers

def get_filter_conditions(filters):
    """Build filter conditions"""
    conditions = {}

    if filters.get("from_date"):
        conditions["transaction_date"] = [">=", filters.get("from_date")]
    if filters.get("customer_group"):
        conditions["customer_group"] = filters.get("customer_group")

    return conditions

def get_summary(data):
    """Return report summary"""

    total_revenue = sum([d["revenue"] for d in data])
    total_orders = sum([d["orders"] for d in data])
    avg_order_value = total_revenue / total_orders if total_orders else 0

    return [
        {
            "value": len(data),
            "label": _("Total Customers"),
            "indicator": "blue",
            "datatype": "Int"
        },
        {
            "value": total_revenue,
            "label": _("Total Revenue"),
            "indicator": "green",
            "datatype": "Currency"
        },
        {
            "value": total_orders,
            "label": _("Total Orders"),
            "indicator": "blue",
            "datatype": "Int"
        },
        {
            "value": avg_order_value,
            "label": _("Avg Order Value"),
            "indicator": "orange",
            "datatype": "Currency"
        }
    ]
```

### Report with Tree View

```python
def execute(filters=None):
    """Hierarchical territory sales report"""

    columns = get_columns()
    data = get_data(filters)

    return columns, data, None, None, None, get_tree_data(data)

def get_tree_data(data):
    """Format data for tree view"""

    tree = []

    # Group by territory
    territories = {}
    for row in data:
        territory = row["territory"]
        if territory not in territories:
            territories[territory] = {
                "territory": territory,
                "revenue": 0,
                "children": []
            }
        territories[territory]["revenue"] += row["revenue"]
        territories[territory]["children"].append(row)

    # Convert to tree format
    for territory, details in territories.items():
        tree.append({
            "value": details["revenue"],
            "label": territory,
            "expandable": True,
            "children": [
                {
                    "value": child["revenue"],
                    "label": child["customer"]
                }
                for child in details["children"]
            ]
        })

    return tree
```

## Dashboards

### Creating Dashboards

```python
# Create dashboard via code
dashboard = frappe.get_doc({
    "doctype": "Dashboard",
    "dashboard_name": "Sales Dashboard",
    "module": "CRM",

    # Charts
    "charts": [
        {
            "chart": "Sales Trend"
        },
        {
            "chart": "Top Customers"
        }
    ]
}).insert()
```

### Dashboard Charts

```python
# Create chart
chart = frappe.get_doc({
    "doctype": "Dashboard Chart",
    "chart_name": "Sales Trend",
    "chart_type": "Line",
    "document_type": "Sales Order",
    "based_on": "transaction_date",
    "value_based_on": "grand_total",
    "time_interval": "Monthly",
    "timespan": "Last Year",
    "color": "#7cd6fd",
    "filters_json": json.dumps([
        ["Sales Order", "docstatus", "=", 1]
    ])
}).insert()
```

### Custom Dashboard

```javascript
// dashboard.js
frappe.pages['sales-dashboard'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Sales Dashboard',
        single_column: true
    });

    // Add filters
    page.add_field({
        fieldname: 'from_date',
        label: __('From Date'),
        fieldtype: 'Date',
        default: frappe.datetime.month_start(),
        change: () => refresh_dashboard(page)
    });

    // Load dashboard
    refresh_dashboard(page);
};

function refresh_dashboard(page) {
    let filters = {
        from_date: page.fields_dict.from_date.get_value(),
        to_date: page.fields_dict.to_date.get_value()
    };

    // Load KPIs
    frappe.call({
        method: 'myapp.dashboard.get_kpis',
        args: {filters: filters},
        callback: (r) => {
            render_kpis(page, r.message);
        }
    });

    // Load chart
    frappe.call({
        method: 'myapp.dashboard.get_sales_trend',
        args: {filters: filters},
        callback: (r) => {
            render_chart(page, r.message);
        }
    });
}
```

## Charts and Visualizations

### Chart Types

```python
# Bar Chart
chart = {
    "data": {
        "labels": ["Jan", "Feb", "Mar", "Apr"],
        "datasets": [{
            "name": "Sales",
            "values": [100, 150, 120, 180]
        }]
    },
    "type": "bar",
    "height": 250,
    "colors": ["#7cd6fd"]
}

# Line Chart
chart = {
    "data": {
        "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
        "datasets": [{
            "name": "Revenue",
            "values": [1000, 1200, 1100, 1500]
        }]
    },
    "type": "line",
    "height": 250,
    "colors": ["#5e64ff"]
}

# Pie Chart
chart = {
    "data": {
        "labels": ["Product A", "Product B", "Product C"],
        "datasets": [{
            "name": "Sales",
            "values": [45, 30, 25]
        }]
    },
    "type": "pie",
    "height": 250,
    "colors": ["#7cd6fd", "#5e64ff", "#743ee2"]
}

# Donut Chart
chart = {
    "data": {
        "labels": ["North", "South", "East", "West"],
        "datasets": [{
            "name": "Territory Sales",
            "values": [40, 25, 20, 15]
        }]
    },
    "type": "donut",
    "height": 250
}
```

### Multi-Dataset Charts

```python
chart = {
    "data": {
        "labels": ["Q1", "Q2", "Q3", "Q4"],
        "datasets": [
            {
                "name": "Revenue",
                "values": [100, 150, 120, 180]
            },
            {
                "name": "Profit",
                "values": [20, 30, 25, 40]
            }
        ]
    },
    "type": "bar",
    "height": 300,
    "colors": ["#7cd6fd", "#5e64ff"],
    "barOptions": {
        "stacked": 0
    }
}
```

## Report Builder Patterns

### Parameterized Reports

```python
@frappe.whitelist()
def get_sales_by_territory(territory, from_date, to_date):
    """Get sales report for specific territory"""

    data = frappe.db.sql("""
        SELECT
            so.name,
            so.customer,
            so.transaction_date,
            so.grand_total
        FROM `tabSales Order` so
        WHERE so.territory = %(territory)s
            AND so.transaction_date BETWEEN %(from_date)s AND %(to_date)s
        ORDER BY so.transaction_date DESC
    """, {
        "territory": territory,
        "from_date": from_date,
        "to_date": to_date
    }, as_dict=True)

    return data
```

### Aggregation Reports

```python
def get_monthly_sales_summary(filters):
    """Monthly sales aggregation"""

    data = frappe.db.sql("""
        SELECT
            DATE_FORMAT(transaction_date, '%%Y-%%m') as month,
            COUNT(*) as order_count,
            SUM(grand_total) as total_sales,
            AVG(grand_total) as avg_order_value,
            MAX(grand_total) as max_order,
            MIN(grand_total) as min_order
        FROM `tabSales Order`
        WHERE transaction_date BETWEEN %(from_date)s AND %(to_date)s
            AND docstatus = 1
        GROUP BY DATE_FORMAT(transaction_date, '%%Y-%%m')
        ORDER BY month
    """, filters, as_dict=True)

    return data
```

## Report Permissions

```python
def has_report_permission(filters):
    """Custom permission check for report"""

    user = frappe.session.user

    # Administrators can see all
    if user == "Administrator":
        return True

    # Managers can see all
    if "Sales Manager" in frappe.get_roles():
        return True

    # Users can only see their own territory
    if filters.get("territory"):
        user_territories = frappe.get_all("User Permission",
            filters={
                "user": user,
                "allow": "Territory"
            },
            pluck="for_value"
        )

        if filters.get("territory") not in user_territories:
            frappe.throw("Not permitted to view this territory")

    return True
```

## Export Reports

```python
@frappe.whitelist()
def export_report_to_excel(report_name, filters=None):
    """Export report to Excel"""

    from frappe.desk.query_report import run

    # Get report data
    result = run(report_name, filters=filters)

    columns = result["columns"]
    data = result["result"]

    # Create Excel file
    from frappe.utils.xlsxutils import make_xlsx
    xlsx_file = make_xlsx(data, "Report", columns=columns)

    # Return for download
    frappe.response.filename = f"{report_name}.xlsx"
    frappe.response.filecontent = xlsx_file.getvalue()
    frappe.response.type = "download"
```

## Scheduled Reports

```python
# In hooks.py
scheduler_events = {
    "daily": [
        "myapp.reports.send_daily_sales_report"
    ],
    "weekly": [
        "myapp.reports.send_weekly_summary"
    ]
}

# In reports.py
def send_daily_sales_report():
    """Send daily sales report to managers"""

    from frappe.utils import today, add_days

    filters = {
        "from_date": today(),
        "to_date": today()
    }

    # Generate report
    columns, data = execute(filters)

    # Create HTML table
    html = create_report_html(columns, data)

    # Send email
    frappe.sendmail(
        recipients=get_manager_emails(),
        subject=f"Daily Sales Report - {today()}",
        message=html
    )
```

## Best Practices

**DO:**
- ✅ Use parameterized queries (SQL injection safe)
- ✅ Add filters for date ranges
- ✅ Implement pagination for large datasets
- ✅ Cache expensive reports
- ✅ Add permission checks
- ✅ Include summary statistics
- ✅ Export to Excel/CSV option
- ✅ Use visualizations (charts)

**DON'T:**
- ❌ Run reports without date range limits
- ❌ Expose sensitive data without permissions
- ❌ Use SELECT * in production reports
- ❌ Ignore report performance
- ❌ Hardcode filter values
- ❌ Skip data validation
- ❌ Create reports without documentation

## Performance Optimization

```python
# Use indexes
frappe.db.sql("CREATE INDEX idx_transaction_date ON `tabSales Order`(transaction_date)")

# Cache report results
@frappe.whitelist()
def get_cached_report(filters):
    cache_key = f"report:{filters}"

    data = frappe.cache().get_value(cache_key)

    if not data:
        columns, data = execute(filters)
        frappe.cache().set_value(cache_key, data, expires_in_sec=300)  # 5 min

    return data

# Use prepared reports for heavy queries
# Create via: bench --site site1.local prepared-report
```

## Next Steps

- Manage data → `frappe-fixtures`
- Optimize queries → `frappe-performance`
- Handle schema changes → `frappe-migrations`
- Deploy reports → `frappe-deployment`
