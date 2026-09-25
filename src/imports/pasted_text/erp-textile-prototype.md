Create a simple, clean and user-friendly ERP software for a Pakistani textile waste processing business.

IMPORTANT:
Build a functional clickable prototype, not just a static design.

The software should be easy for a normal business user to understand.

Use realistic dummy data everywhere.

Make the complete software responsive for:
- Desktop
- Tablet
- Mobile

All important buttons, cards, rows, dropdowns, tabs and menu items must be clickable.

==================================================
BUSINESS FLOW
==================================================

The business purchases waste fabric.

Then:
Purchase Waste Fabric
→ Store in Warehouse
→ Issue Material for Processing
→ Make Finished Product
→ Store Finished Product
→ Sell Product
→ Receive Payment

Main modules should simply follow this flow.

==================================================
MAIN MENU
==================================================

Dashboard

Masters
- Parties
- Items
- Qualities
- Warehouses

Transactions
- Purchase
- Issue
- Production
- Sale
- Receipt
- Payment

Stock
- Stock
- Stock Ledger

Accounts
- Party Ledger
- Cash / Bank
- Receivable
- Payable
- Expenses

Reports
- Purchase Report
- Sale Report
- Stock Report
- Production Report
- Profit & Loss

Settings
- Numbering
- Users

Keep the sidebar simple and uncluttered.

==================================================
DASHBOARD
==================================================

Create a simple dashboard with:

Total Stock
Raw Material
Finished Products
Today's Purchase
Today's Sale
Receivable
Payable
Cash
Bank

Add quick buttons:

+ Purchase
+ Issue
+ Production
+ Sale
+ Receipt
+ Payment

Show:

Recent Purchases
Recent Sales
Low Stock
Recent Production

Every card and transaction should be clickable.

==================================================
PARTIES
==================================================

Create a simple Party page.

Party fields:

Party Name
Party Type
Phone
City
Opening Balance

Party Types:
- Supplier
- Customer
- Both

Dummy data:

Al-Hamd Textile Traders
New Asia Fabric Waste
Malik Waste Traders
Ahmed Textile Mills
Star Fabric Traders

Clicking a party should open:

Party Details
Transactions
Ledger
Balance

==================================================
ITEMS
==================================================

Create a simple Item page.

Each item should have:

Item Name
Item Code
Category
Quality
Unit
Default Rate

Categories:

Raw Material
Finished Product

Dummy Raw Materials:

Cotton Waste
Polyester Waste
Mixed Fabric Waste
Denim Waste
Cutting Waste

Dummy Finished Products:

Processed Cotton
Processed Polyester
Mixed Fabric Product
Recycled Textile Product

==================================================
QUALITIES
==================================================

Create a separate simple Quality page.

Examples:

Cotton A
Cotton B
Polyester A
Mixed
Denim
White Cutting
Colored Cutting

Quality should be selectable while purchasing or issuing material.

==================================================
WAREHOUSES
==================================================

Create simple warehouse management.

Dummy warehouses:

Raw Material Store
Waste Store
Production Area
Finished Goods Store

Show stock inside each warehouse.

==================================================
PURCHASE
==================================================

Create a simple Purchase screen.

Top:

Purchase No
Date
Supplier
Warehouse

Then item table:

Item
Quality
Quantity
Rate
Amount

Example:

Cotton Waste
Quality A
500 KG
Rs.80
Rs.40,000

Cotton Waste
Quality A
300 KG
Rs.100
Rs.30,000

Total:
Rs.70,000

Paid:
Rs.30,000

Balance:
Rs.40,000

When Purchase is saved:

Stock increases.

Supplier balance updates.

If payment is made:
Cash/Bank decreases.

Make the Purchase form very easy to understand.

Use searchable dropdowns for:
Supplier
Item
Quality
Warehouse

==================================================
IMPORTANT: AVERAGE RATE
==================================================

The same material can be purchased at different rates.

Example:

500 KG × Rs.80
300 KG × Rs.100

The system should automatically calculate:

Total Quantity = 800 KG

Total Value = Rs.70,000

Average Rate = Rs.87.50/KG

Show:

Cotton Waste A
Stock: 800 KG
Average Rate: Rs.87.50
Stock Value: Rs.70,000

Do not mix different qualities.

==================================================
ISSUE
==================================================

This is an important module.

The business takes raw material from the warehouse for processing.

Create a simple Issue screen.

Issue No
Date
From Warehouse
Production Area

Items:

Item
Quality
Available Stock
Issue Quantity
Rate
Value

Example:

Cotton Waste
Quality A
Available: 800 KG
Issue: 300 KG
Rate: Rs.87.50
Value: Rs.26,250

After saving:

Raw material stock decreases.

The Issue should be visible in Stock Ledger.

Do not allow issuing more than available stock.

Show a simple warning if stock is insufficient.

==================================================
PRODUCTION
==================================================

Create a simple Production screen.

The business uses waste material to make finished products.

Example:

Production No:
PRD-00032

Product:
Processed Cotton

Material Used:

Cotton Waste A
500 KG

Polyester Waste A
100 KG

Total Input:
600 KG

Finished Product:
520 KG

Waste:
80 KG

Show:

Input
Output
Waste
Yield %

Keep this screen simple.

After Production:

Raw material decreases.

Finished product stock increases.

==================================================
FINISHED STOCK
==================================================

Finished products should appear separately from raw materials.

Example:

Processed Cotton
520 KG
Average Cost Rs.115/KG
Value Rs.59,800

==================================================
SALE
==================================================

Create a simple Sale screen.

Sale No
Date
Customer
Warehouse

Items:

Finished Product
Quality
Quantity
Rate
Amount

Example:

Processed Cotton
500 KG
Rs.145
Rs.72,500

Received:
Rs.40,000

Balance:
Rs.32,500

After Sale:

Finished stock decreases.

Customer balance updates.

If payment is received:
Cash/Bank increases.

==================================================
RECEIPT
==================================================

Simple Receipt screen:

Customer
Date
Amount
Cash/Bank Account
Description

Example:

Ahmed Textile Mills
Rs.40,000
Meezan Bank

After saving:

Customer balance decreases.

Bank balance increases.

==================================================
PAYMENT
==================================================

Simple Payment screen:

Supplier
Date
Amount
Cash/Bank Account
Description

After saving:

Supplier balance decreases.

Cash/Bank decreases.

==================================================
CASH / BANK
==================================================

Show:

Cash Balance
Meezan Bank
HBL
UBL

Transactions:

Date
Description
Received
Paid
Balance

Allow:

Receipt
Payment
Transfer

==================================================
PARTY LEDGER
==================================================

Create a simple ledger.

Example:

Al-Hamd Textile Traders

Opening Balance
Rs.100,000

Purchase
Rs.250,000

Payment
Rs.150,000

Current Balance
Rs.200,000

Columns:

Date
Details
Debit
Credit
Balance

Click any transaction to open its original transaction.

==================================================
STOCK
==================================================

Create a simple Stock page.

Columns:

Item
Quality
Warehouse
Quantity
Average Rate
Stock Value

Example:

Cotton Waste
A
Raw Material Store
800 KG
Rs.87.50
Rs.70,000

Filters:

Item
Quality
Warehouse

Click any stock row to open Stock Detail.

==================================================
STOCK LEDGER
==================================================

Show stock movement:

Opening
Purchase +
Issue -
Production -
Production +
Sale -

Example:

Cotton Waste A

Opening: 300 KG
Purchase: +800 KG
Issue: -300 KG
Balance: 800 KG

==================================================
REPORTS
==================================================

Keep reports simple.

Purchase Report:
- Date
- Supplier
- Item
- Quantity
- Amount

Sale Report:
- Date
- Customer
- Product
- Quantity
- Amount

Stock Report:
- Item
- Quality
- Warehouse
- Quantity
- Value

Production Report:
- Product
- Input
- Output
- Waste
- Yield

Party Statement:
- Debit
- Credit
- Balance

Profit & Loss:
Sales
- Cost
- Expenses
= Profit

Every report should have:

Date Filter
Search
Export
Print

==================================================
NUMBERING
==================================================

Client will provide the exact numbering pattern later.

Create a simple Numbering Settings page.

Allow number patterns for:

Purchase
Sale
Issue
Production
Receipt
Payment

Example:

PUR-0001
SAL-0001
ISS-0001
PRD-0001

Make the pattern editable.

==================================================
DUMMY DATA
==================================================

IMPORTANT:

Do NOT leave pages empty.

Add realistic dummy data.

Use Pakistani business names.

Use:
PKR
KG
Lahore
Faisalabad
Karachi
Gujranwala

Add at least:

15 Parties
15 Items
7 Qualities
4 Warehouses
20 Purchases
15 Sales
10 Issues
10 Productions
15 Receipts
15 Payments
20 Expenses

Use September 2026 dates.

==================================================
CLICKABLE PROTOTYPE
==================================================

Everything important must be clickable.

Examples:

Dashboard Stock Card
→ Stock Page

Purchase Card
→ Purchase Report

Party Name
→ Party Details

Purchase Number
→ Purchase Detail

Sale Number
→ Sale Detail

Issue Number
→ Issue Detail

Production Number
→ Production Detail

Stock Item
→ Stock Detail

Party Balance
→ Party Ledger

Quick Action
→ Create Transaction

Back button
→ Previous page

Edit
→ Edit form

Delete
→ Confirmation popup

Print
→ Print Preview

Export
→ Show export confirmation

==================================================
RESPONSIVE DESIGN
==================================================

DESKTOP:

Use left sidebar.

Show tables normally.

Use cards and clear spacing.

MOBILE:

Sidebar becomes hamburger menu.

Tables should become cards or horizontal scroll.

Forms should become one column.

Buttons should be easy to tap.

Dashboard cards should stack.

Do not allow content to go outside the screen.

Support:

375px
390px
430px
768px
1024px
1280px
1440px

==================================================
UI STYLE
==================================================

Keep the UI simple.

Do not make it look like complicated accounting software.

Use:

Clean white/neutral background
Professional primary color
Simple cards
Readable tables
Clear buttons
Simple icons
Consistent spacing

Avoid:
- Excessive gradients
- Too many colors
- Too many cards
- Complicated charts
- Tiny text
- Unnecessary fields

The user should understand each page immediately.

==================================================
FINAL GOAL
==================================================

The software should feel like:

"Old software ka same business workflow,
lekin modern, simple aur easy-to-use."

The most important flow is:

PURCHASE
↓
STOCK
↓
ISSUE
↓
PRODUCTION
↓
FINISHED STOCK
↓
SALE
↓
CUSTOMER
↓
RECEIPT

Supplier side:

PURCHASE
↓
SUPPLIER BALANCE
↓
PAYMENT

Make the complete prototype connected, clickable, responsive and filled with dummy data.

Do not create only a dashboard.

Create the actual working screens for all major modules.