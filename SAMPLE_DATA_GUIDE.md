# 📦 Sample Data Guide - BizEase UAE

**Purpose:** Step-by-step guide with examples for adding sample test data to your BizEase system  
**Date Created:** January 2025

---

## 🎯 Overview

This guide provides practical examples for adding sample data to test your BizEase UAE system before going live. Follow these examples to populate your database with realistic test data.

---

## 📦 **1. INVENTORY ITEMS**

### How to Add Inventory Items

**Location:** Navigate to **Inventory & Sales** → Click **"Add Item"**

### Required Fields:
- **Name** (Required): Item name
- **SKU** (Optional): Stock Keeping Unit / Barcode
- **Stock** (Required): Current stock quantity
- **Cost Price** (Optional): Purchase cost per unit
- **Sale Price** (Required): Selling price per unit
- **Supplier** (Optional): Supplier name

**Note:** Category and Reorder Level fields are not available in the current UI form.

### Sample Inventory Items (10 Examples)

#### 1. Coffee & Beverages
```
Name: Arabic Coffee (Gahwa)
SKU: BEV-001
Stock: 50
Cost Price: 25.00 AED
Sale Price: 35.00 AED
Supplier: Al Khaleej Trading
```

#### 2. Electronics
```
Name: Wireless Mouse
SKU: ELEC-001
Stock: 30
Cost Price: 45.00 AED
Sale Price: 65.00 AED
Supplier: Tech Solutions UAE
```

#### 3. Office Supplies
```
Name: A4 Paper (500 sheets)
SKU: OFF-001
Stock: 100
Cost Price: 15.00 AED
Sale Price: 22.00 AED
Supplier: Office Depot UAE
```

#### 4. Food Items
```
Name: Dates (1kg)
SKU: FOOD-001
Stock: 75
Cost Price: 30.00 AED
Sale Price: 45.00 AED
Supplier: Al Ain Dates
```

#### 5. Cleaning Supplies
```
Name: Dishwashing Liquid (1L)
SKU: CLN-001
Stock: 40
Cost Price: 12.00 AED
Sale Price: 18.00 AED
Supplier: CleanPro UAE
```

#### 6. Snacks
```
Name: Chips (200g)
SKU: SNACK-001
Stock: 60
Cost Price: 8.00 AED
Sale Price: 12.00 AED
Supplier: Food Distributors
```

#### 7. Personal Care
```
Name: Shampoo (400ml)
SKU: PC-001
Stock: 35
Cost Price: 20.00 AED
Sale Price: 30.00 AED
Supplier: Beauty Supplies Co
```

#### 8. Stationery
```
Name: Blue Pen (Pack of 10)
SKU: STAT-001
Stock: 80
Cost Price: 10.00 AED
Sale Price: 15.00 AED
Supplier: Stationery Plus
```

#### 9. Water & Drinks
```
Name: Mineral Water (500ml x 24)
SKU: BEV-002
Stock: 45
Cost Price: 18.00 AED
Sale Price: 28.00 AED
Supplier: Aqua UAE
```

#### 10. Cables & Accessories
```
Name: USB-C Cable (2m)
SKU: ELEC-002
Stock: 25
Cost Price: 15.00 AED
Sale Price: 25.00 AED
Supplier: Tech Solutions UAE
```

### Tips for Adding Inventory:
- ✅ Use unique SKUs for easy barcode scanning
- ✅ Set realistic prices (Cost Price < Sale Price)
- ✅ Add supplier info for purchase tracking
- ✅ Ensure Stock is a positive number
- ✅ Sale Price is required, Cost Price is optional

### How to Test Barcode Scanning (Without a Physical Scanner):
**Good news:** You don't need a physical barcode scanner to test! Barcode scanners work like keyboards - they just type the code and press Enter.

**Testing Steps:**
1. Go to **POS** page (Point of Sale)
2. You'll see a **"Scan Barcode or Enter SKU"** input field at the top
3. Type the SKU of an item (e.g., type `BEV-001` for Arabic Coffee)
4. Press **Enter** key
5. The item should be found and added to your cart automatically
6. Try typing a non-existent SKU (e.g., `INVALID-999`) and press Enter - you should see an error message

**Example Test:**
- Type: `BEV-001` → Press Enter → Arabic Coffee should be added to cart
- Type: `ELEC-001` → Press Enter → Wireless Mouse should be added to cart
- Type: `FAKE-123` → Press Enter → Error: "Item with barcode 'FAKE-123' not found"

---

## 👥 **2. EMPLOYEES**

### How to Add Employees

**Location:** Navigate to **Employees** → Click **"Add Employee"**

### Required Fields:
- **Full Name** (Required): Employee's full name
- **Email** (Optional): Email address
- **Phone** (Optional): Phone number
- **Designation** (Optional): Job title/position
- **Basic Salary** (Optional): Monthly salary in AED
- **Allowance** (Optional): Additional allowances
- **Nationality** (Optional): Employee nationality
- **Emirates ID** (Optional): Emirates ID number
- **Passport Number** (Optional): Passport number
- **Passport Expiry** (Optional): Passport expiry date
- **Visa Expiry** (Optional): Visa expiry date (important for notifications!)
- **Insurance Expiry** (Optional): Insurance expiry date
- **Joining Date** (Optional): Employment start date
- **Contract Type** (Optional): full-time, part-time, contract, temporary
- **Notes** (Optional): Additional notes

### Sample Employees (3 Examples)

#### 1. Sales Manager
```
Full Name: Ahmed Al Mansoori
Email: ahmed.almansoori@example.com
Phone: +971 50 123 4567
Nationality: UAE
Designation: Sales Manager
Contract Type: full-time
Basic Salary: 8,000.00 AED
Allowance: 1,000.00 AED
Emirates ID: 784-1985-1234567-1
Passport Number: A12345678
Passport Expiry: 2026-12-31
Visa Expiry: 2025-11-15 (⚠️ Set to expire soon for testing notifications)
Insurance Expiry: 2025-12-31
Joining Date: 2023-01-15
Notes: Experienced in retail management
```

#### 2. Cashier
```
Full Name: Fatima Hassan
Email: fatima.hassan@example.com
Phone: +971 55 987 6543
Nationality: Egyptian
Designation: Cashier
Contract Type: full-time
Basic Salary: 3,500.00 AED
Allowance: 500.00 AED
Emirates ID: 784-1990-7654321-2
Passport Number: E98765432
Passport Expiry: 2027-06-30
Visa Expiry: 2026-03-20
Insurance Expiry: 2026-06-30
Joining Date: 2024-03-01
Notes: Bilingual (Arabic/English)
```

#### 3. Accountant
```
Full Name: Mohammed Ali
Email: mohammed.ali@example.com
Phone: +971 52 456 7890
Nationality: Pakistani
Designation: Accountant
Contract Type: full-time
Basic Salary: 5,000.00 AED
Allowance: 800.00 AED
Emirates ID: 784-1988-1122334-3
Passport Number: P11223344
Passport Expiry: 2028-09-15
Visa Expiry: 2027-08-10
Insurance Expiry: 2027-09-15
Joining Date: 2023-06-01
Notes: Certified accountant, handles VAT filing
```

### Tips for Adding Employees:
- ✅ Set visa/passport expiry dates to test notification system
- ✅ Use realistic UAE phone numbers (+971 format)
- ✅ Include Emirates ID for UAE employees
- ✅ Set joining dates for accurate payroll calculations
- ✅ Add notes for important information

---

## 💰 **3. EXPENSES**

### How to Add Expenses

**Location:** Navigate to **Expenses** → Click **"Add Expense"**

### Required Fields:
- **Category** (Required): Expense category
- **Date** (Required): Expense date
- **Amount** (Required): Expense amount in AED
- **Description** (Optional): Expense description
- **Supplier** (Optional): Vendor/supplier name
- **Payment Type** (Optional): Cash, Bank Transfer, Credit Card, etc.
- **VAT Applicable** (Optional): Check if VAT applies
- **Receipt URL** (Optional): Link to uploaded receipt

### Available Expense Categories:
- Office Rent
- Utilities (Electricity, Water, Internet)
- Salaries & Wages
- Professional Services (Legal, Accounting)
- Marketing & Advertising
- Office Supplies
- Equipment & Furniture
- Travel & Transportation
- Insurance
- Bank Charges
- Software & Subscriptions
- Maintenance & Repairs
- Training & Development
- Telecommunications
- Other

### Sample Expenses (5 Examples)

#### 1. Office Rent
```
Category: Office Rent
Date: 2025-01-01
Amount: 5,000.00 AED
Description: Monthly office rent - January 2025
Supplier: Dubai Properties
Payment Type: Bank Transfer
VAT Applicable: No
```

#### 2. Utilities
```
Category: Utilities (Electricity, Water, Internet)
Date: 2025-01-15
Amount: 850.00 AED
Description: DEWA bill + Du internet
Supplier: DEWA / Du
Payment Type: Bank Transfer
VAT Applicable: Yes (5% VAT)
```

#### 3. Office Supplies
```
Category: Office Supplies
Date: 2025-01-10
Amount: 450.00 AED
Description: Printer paper, pens, folders
Supplier: Office Depot UAE
Payment Type: Credit Card
VAT Applicable: Yes
```

#### 4. Marketing & Advertising
```
Category: Marketing & Advertising
Date: 2025-01-20
Amount: 2,500.00 AED
Description: Social media advertising campaign
Supplier: Facebook Ads
Payment Type: Online Payment
VAT Applicable: Yes
```

#### 5. Professional Services
```
Category: Professional Services (Legal, Accounting)
Date: 2025-01-25
Amount: 1,200.00 AED
Description: Monthly accounting services
Supplier: ABC Accounting Firm
Payment Type: Bank Transfer
VAT Applicable: Yes
```

### Tips for Adding Expenses:
- ✅ Use realistic dates (current month/year)
- ✅ Select appropriate categories
- ✅ Mark VAT applicable for UAE VAT-registered suppliers
- ✅ Add supplier names for tracking
- ✅ Use different payment types for variety

---

## 🧾 **4. CUSTOMERS (For Invoicing)**

### How to Add Customers (via Invoices)

**Note:** In BizEase, customers are created when you create invoices. Each invoice can have customer details.

**Location:** Navigate to **Invoices** → Click **"Create Invoice"**

### Customer Fields in Invoice:
- **Customer Name** (Required): Customer's full name or company name
- **Customer Email** (Optional): Customer email
- **Customer Phone** (Optional): Customer phone number
- **Customer TRN** (Optional): Customer Tax Registration Number (for VAT)

### Sample Customers (via Sample Invoices)

#### 1. Corporate Customer
```
Invoice Number: (Auto-generated)
Customer Name: Al Rashid Trading LLC
Customer Email: accounts@alrashid.ae
Customer Phone: +971 4 123 4567
Customer TRN: 100123456700003
Issue Date: 2025-01-15
Payment Terms: 30 days
Status: Sent

Items:
- Consulting Services: 5,000.00 AED (Qty: 1)
- VAT (5%): 250.00 AED
- Total: 5,250.00 AED
```

#### 2. Individual Customer
```
Invoice Number: (Auto-generated)
Customer Name: Sarah Al Maktoum
Customer Email: sarah.almaktoum@email.com
Customer Phone: +971 50 111 2222
Customer TRN: (Leave empty for individuals)
Issue Date: 2025-01-20
Payment Terms: 14 days
Status: Draft

Items:
- Product A: 1,200.00 AED (Qty: 2)
- Product B: 800.00 AED (Qty: 1)
- Discount: 100.00 AED
- VAT (5%): 95.00 AED
- Total: 1,995.00 AED
```

#### 3. Small Business
```
Invoice Number: (Auto-generated)
Customer Name: Tech Solutions FZE
Customer Email: info@techsolutions.ae
Customer Phone: +971 4 987 6543
Customer TRN: 100987654300001
Issue Date: 2025-01-25
Payment Terms: 60 days
Status: Paid

Items:
- Software License: 3,000.00 AED (Qty: 1)
- Support Services: 1,500.00 AED (Qty: 1)
- VAT (5%): 225.00 AED
- Total: 4,725.00 AED
```

### Tips for Creating Invoices:
- ✅ Use realistic customer names (UAE business names)
- ✅ Add TRN for VAT-registered businesses
- ✅ Set different payment terms (7, 14, 30, 60 days)
- ✅ Use different statuses (draft, sent, paid)
- ✅ Include multiple line items
- ✅ Test discount functionality
- ✅ Verify VAT calculations (5%)

---

## 🎯 **Quick Setup Checklist**

### Minimum Test Data Required:

- [ ] **Inventory Items:** At least 10 items with SKUs
- [ ] **Employees:** At least 2-3 employees with visa expiry dates
- [ ] **Expenses:** At least 5 expenses from different categories
- [ ] **Invoices:** At least 3 invoices with different customers
- [ ] **Sales:** Make at least 5 POS sales to test the flow

---

## 📝 **Testing Workflow**

### Step 1: Add Inventory Items
1. Go to **Inventory & Sales**
2. Add 10 items using the examples above
3. Verify items appear in POS quick select grid
4. Test barcode scanning with SKUs

### Step 2: Add Employees
1. Go to **Employees**
2. Add 2-3 employees using the examples above
3. Set visa expiry dates (some soon, some later)
4. Verify employees appear in list
5. Check notifications for expiring documents

### Step 3: Add Expenses
1. Go to **Expenses**
2. Add 5 expenses using different categories
3. Verify expenses appear in list
4. Check accounting integration (journal entries)

### Step 4: Create Invoices
1. Go to **Invoices**
2. Create 3 invoices with different customers
3. Test different statuses (draft, sent, paid)
4. Verify VAT calculations
5. Download PDF invoices

### Step 5: Make POS Sales
1. Go to **POS** (from Inventory page)
2. Make 5-10 sales using inventory items
3. Verify stock decreases
4. Check sales appear in Daily Sales Report
5. Verify accounting entries created

---

## 🔍 **Verification Steps**

After adding sample data, verify:

### Inventory:
- [ ] Items appear in inventory list
- [ ] Items appear in POS quick select
- [ ] SKUs can be scanned/entered
- [ ] Stock levels are correct

### Employees:
- [ ] Employees appear in employee list
- [ ] Expiry notifications work (if dates are soon)
- [ ] Employee details are saved correctly
- [ ] Can edit employee information

### Expenses:
- [ ] Expenses appear in expense list
- [ ] Categories are correct
- [ ] Journal entries created in Accounting
- [ ] Can filter by category/date

### Invoices:
- [ ] Invoices appear in invoice list
- [ ] PDF generation works
- [ ] VAT calculations are correct
- [ ] Journal entries created in Accounting
- [ ] Customer information is saved

### Sales:
- [ ] Sales appear in sales list
- [ ] Stock decreases after sale
- [ ] Daily Sales Report shows sales
- [ ] Accounting entries created

---

## 🚨 **Common Issues & Solutions**

### Issue: Items not appearing in POS
**Solution:** 
- Check that items have stock > 0
- Verify items are saved successfully
- Refresh the POS page

### Issue: Employee notifications not showing
**Solution:**
- Set visa/passport expiry dates within 30 days
- Check notification system is running
- Verify dates are in correct format (YYYY-MM-DD)

### Issue: Expenses not creating journal entries
**Solution:**
- Verify accounting module is set up
- Check expense is saved (not draft)
- Verify accounting accounts exist

### Issue: Invoice VAT calculation wrong
**Solution:**
- Check VAT rate is 5% (UAE standard)
- Verify items have correct prices
- Check discount calculations

---

## 📞 **Need Help?**

If you encounter issues:
1. Check browser console for errors
2. Check server logs
3. Verify database connection
4. Review the TESTING_CHECKLIST.md for detailed test procedures

---

**Last Updated:** January 2025  
**Version:** 1.0

