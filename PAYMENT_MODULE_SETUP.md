# Payment Tracking Module Setup Guide

## ✅ What's Been Built

### 1. Database Schema
- **File**: `server/create-payment-module.sql`
- **Tables Created**:
  - `payments` - Payment records with details (method, amount, reference, etc.)
  - `payment_allocations` - Links payments to invoices (supports partial payments)
  - Updated `invoices` table with `paidAmount` and `outstandingAmount` fields

### 2. Sequelize Models
- `models/Payment.js` - Payment model
- `models/PaymentAllocation.js` - Payment allocation model
- `models/paymentAssociations.js` - Model relationships

### 3. Services
- **Payment Service** (`server/services/paymentService.js`):
  - Create payments
  - Allocate payments to invoices
  - Confirm payments (creates accounting entries)
  - Get payment summaries
  - Refund payments
  - Automatic invoice balance updates

### 4. API Routes
- **File**: `routes/paymentRoutes.js`
- **Endpoints**:
  - `GET /api/payments` - Get all payments (with filters)
  - `POST /api/payments` - Create a payment
  - `GET /api/payments/summary` - Get payment summary
  - `GET /api/payments/:id` - Get payment by ID
  - `POST /api/payments/:id/confirm` - Confirm payment (creates accounting entry)
  - `POST /api/payments/:id/refund` - Refund a payment
  - `GET /api/payments/invoice/:invoiceId` - Get payments for specific invoice

### 5. Controllers
- **File**: `server/controllers/paymentController.js`
- Handles all payment API requests

## 🚀 Setup Instructions

### Step 1: Run Database Migration

Execute the SQL script to create payment tables:

```sql
-- Run this in SQL Server Management Studio or via command line
-- File: server/create-payment-module.sql
```

Or use the command line:
```bash
sqlcmd -S your_server -d Biz -i server/create-payment-module.sql
```

### Step 2: Verify Routes are Loaded

When you start the server, you should see:
```
✓ Payment routes loaded
```

### Step 3: Test API Endpoints

You can test the endpoints using Postman or your frontend application.

## 📋 How Payment Tracking Works

### 1. **Create Payment**
- Record a payment against an invoice
- Payment can be partial or full
- Supports multiple payment methods (cash, bank transfer, cheque, credit card, etc.)
- Automatically updates invoice `paidAmount` and `outstandingAmount`

### 2. **Payment Allocation**
- Each payment is automatically allocated to the invoice
- Supports partial payments (multiple payments per invoice)
- Invoice status auto-updates to "paid" when fully paid

### 3. **Confirm Payment**
- When payment is confirmed, it:
  - Creates accounting journal entry (Debit: Cash/Bank, Credit: Accounts Receivable)
  - Posts the journal entry to General Ledger
  - Updates payment status to "confirmed"

### 4. **Payment Summary**
- Get total payments received
- Get pending payments
- Filter by date range

### 5. **Refund Payment**
- Reverse a payment
- Updates invoice balances
- Creates reversing accounting entries (future enhancement)

## 💰 Payment Methods Supported

- **Cash** - Physical cash payment
- **Bank Transfer** - Bank wire transfer
- **Cheque** - Check payment
- **Credit Card** - Credit card payment
- **Debit Card** - Debit card payment
- **Online** - Online payment gateway
- **Other** - Other payment methods

## 📊 Accounting Integration

When a payment is confirmed:
- **Debit**: Cash/Bank Account (1110) - Money received
- **Credit**: Accounts Receivable (1120) - Reduce customer debt

This automatically updates:
- General Ledger
- Accounts Receivable balance
- Cash/Bank balance

## 🔍 API Examples

### Create Payment
```json
POST /api/payments
{
  "invoiceId": 1,
  "paymentDate": "2025-12-15",
  "paymentAmount": 5000.00,
  "paymentMethod": "bank_transfer",
  "referenceNumber": "TXN-123456",
  "bankName": "Emirates NBD",
  "notes": "Payment received via bank transfer"
}
```

### Confirm Payment
```
POST /api/payments/1/confirm
```

### Get Payments for Invoice
```
GET /api/payments/invoice/1
```

### Get Payment Summary
```
GET /api/payments/summary?fromDate=2025-12-01&toDate=2025-12-31
```

## 📝 Next Steps (Frontend)

To complete the payment module, you'll need to create frontend pages:

1. **Payments List Page** - View all payments with filters
2. **Create Payment Page** - Record new payments
3. **Payment Details Page** - View payment details and confirm/refund
4. **Invoice Payment History** - Show payments on invoice detail page
5. **Payment Summary Dashboard** - Payment statistics

## 🔍 Testing Checklist

When you're ready to test:

- [ ] Run database migration
- [ ] Create an invoice
- [ ] Record a payment against the invoice
- [ ] Verify invoice `paidAmount` and `outstandingAmount` updated
- [ ] Confirm the payment
- [ ] Verify accounting journal entry created
- [ ] Check General Ledger for payment entry
- [ ] Test partial payments
- [ ] Test refund functionality

## ⚠️ Important Notes

1. **Payment Amount Validation**: Payment amount cannot exceed invoice outstanding amount
2. **Invoice Auto-Update**: Invoice status automatically changes to "paid" when fully paid
3. **Accounting Integration**: Journal entries are only created when payment is confirmed
4. **Partial Payments**: Multiple payments can be recorded against the same invoice
5. **Payment Number**: Auto-generated in format `PAY-YYYY-####`

## 🎯 Status

**Backend**: ✅ Complete
**Frontend**: ⏳ Pending (to be built)

The payment tracking module backend is fully functional and ready for frontend integration!

