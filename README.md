# PRIME HORIZON — User Guide

**Prime Horizon** is a procurement management platform for construction projects. It helps you track purchase orders, manage vendor data, review price changes, and import/excel data — all in one place.

---

## Login

Open the app and enter your corporate email and password. Once logged in, you'll land on the **Dashboard**.

---

## Navigation

The sidebar has one main menu group called **PRIME HORIZON** with four options:

### 1. PR QUOTE DATA (Dashboard)
This is the main dashboard. Here you can see:
- **4 KPI cards** at the top — Total Spend, Number of Purchase Requests, Active Suppliers, Total Line Items
- **Spend Breakdown chart** — Shows spending by month or year. Click on any month bar to drill down to a daily view
- **Project Wise Money Invested** — Table showing how much each project has spent, number of PRs, and line items
- **Materials Maximum Time Purchased** — Table showing which materials are ordered most frequently

Below the dashboard is the **Import PO Data** section where you upload your data (see Import section below).

### 2. PR ORDER REQUEST
Shows all Purchase Requests as cards. Each card displays:
- PR reference number and status (Approved / Open / Sent for approval)
- Project name, supplier, and company
- Req Ref, QC Ref, and Month
- Net Price, VAT, and Total Price
- Price comparison (if original price exists)

Use the filters at the top to sort by **Month**, **Entered By**, or **Status**.

### 3. REVIEW DATA
This opens the **Audit & Review Center** — a high-level overview of all procurement activity. You can:
- See totals: PRs, line items, price changes, items with multiple changes
- View Savings vs Increases by project (bar chart)
- See Price Change Distribution (donut chart)
- Browse Top 10 Suppliers by total spend
- Dig into Multi-Change Items and High Price Variance Items

Under this menu you'll also find:
- **2025 Cycle** / **2026 Cycle** — Year-specific PR lists. Click any PR to open the audit modal where you can paste data for AI-powered verification
- **Sheets** — Raw data tables: PO Data, material details, PR data, purchase orders, merged view. You can resize columns, sort, and export to Excel

### 4. PROJECT DETAILS
Opens the same Sheets view with raw data tables for browsing all records.

---

## Importing PO Data (3-Step Process)

Located on the Dashboard, this lets you upload procurement data from Excel:

**Step 1: Paste PO Log**
Copy your PO log from Excel (tab-separated) and paste it into the text area. The system automatically detects columns (Ref, PO Date, Status, Project, Supplier, Prices, etc.). Click **Validate & Preview** to see the parsed data in a table.

**Step 2: Paste Rate Details**
Select a PR from the carousel and paste its rate details (item code, rate, qty, total). The system calculates subtotals, discounts, VAT, and net totals automatically.

**Step 3: Paste Material Details**
Paste the detailed material breakdown for each item. The system smart-matches columns even if the order is different from expected.

Once all steps are done, click **Import All to Database** to save everything.

> The system also automatically reconciles newly pasted data against existing records — it will show you what's new, what changed, and what matches.

---

## User Management (Admin Only)

If you have admin access, you'll see **User Management** at the bottom of the sidebar.

Here you can:
- View all users (email, role, status, last login)
- Add new users (set email, password, and role)
- Delete users

Roles:
- **Admin** (Owner) — Full access
- **Editor** — Can write to sheets
- **Viewer** — Read-only

---

## Quick Tips

- **Click month bars** on the Spend Breakdown chart to see daily spending
- **Search** using the search bar at the top to find POs and suppliers
- **Export data** from Sheets view using the export button
- **Price comparison** is shown automatically when original and current prices differ
