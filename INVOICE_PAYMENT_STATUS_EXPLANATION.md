# Invoice Status vs Payment Status - How They're Connected

## Overview

In the BizEase system, there are **two separate status fields** that work together:

1. **Invoice Status** - Tracks the overall state of the invoice
2. **Payment Status** - Tracks the state of individual payments

---

## Invoice Status

**Location:** Invoices module → Status column

**Possible Values:**
- `draft` - Invoice is being created, not sent yet
- `sent` - Invoice has been sent to customer
- `viewed` - Customer has viewed the invoice
- `paid` - Invoice is fully paid (all outstanding amount = 0)
- `overdue` - Invoice due date has passed and not fully paid
- `cancelled` - Invoice has been cancelled

**How it's set:**
- **Manually:** You can change it in the Invoices page dropdown
- **Automatically:** When a payment is created, the system updates it:
  - If payment makes invoice fully paid → status becomes `paid`
  - If invoice was `draft` → stays `draft`
  - Otherwise → becomes `sent`

---

## Payment Status

**Location:** Payments module → Status column

**Possible Values:**
- `pending` - Payment is recorded but not yet confirmed/verified (default when created)
- `confirmed` - Payment has been verified and confirmed (set via "Confirm" button)
- `failed` - Payment attempt failed (database supports, but no UI to set)
- `cancelled` - Payment was cancelled (database supports, but no UI to set)
- `refunded` - Payment was refunded (database supports, but no UI to set)

**How it's set:**
- **When created:** Always starts as `pending`
- **Manually:** Can be changed to `confirmed` via the "Confirm" button in the Payments page
- **Note:** The database supports `failed`, `cancelled`, and `refunded` statuses, but the UI currently only allows changing from `pending` to `confirmed`
- **When confirmed:** Creates accounting journal entries

---

## How They Work Together

### Scenario 1: Creating a Payment

```
1. You create a payment for Invoice #18 (Amount: 3,255 AED)
   ↓
2. Payment is created with status = "pending"
   ↓
3. System calculates:
   - Invoice total: 3,255 AED
   - Previous paid: 0 AED
   - New paid: 3,255 AED
   - Outstanding: 0 AED (fully paid!)
   ↓
4. System automatically updates Invoice:
   - paidAmount = 3,255
   - outstandingAmount = 0
   - status = "paid" (because outstanding <= 0.01)
```

**Code Location:** `server/services/paymentService.js` → `allocatePaymentToInvoice()`

```javascript
// Auto-update status if fully paid
const newStatus = outstanding <= 0.01 ? 'paid' : 
                  (invoice.status === 'draft' ? invoice.status : 'sent');
```

### Scenario 2: Partial Payment

```
1. Invoice total: 10,000 AED
2. You create payment: 3,000 AED
   ↓
3. Payment status = "pending"
   ↓
4. Invoice updates:
   - paidAmount = 3,000
   - outstandingAmount = 7,000
   - status = "sent" (not fully paid, so stays "sent" or changes from "draft" to "sent")
```

### Scenario 3: Multiple Payments

```
Invoice #18: Total = 10,000 AED

Payment 1: 3,000 AED (status: pending)
  → Invoice: paidAmount = 3,000, outstanding = 7,000, status = "sent"

Payment 2: 4,000 AED (status: pending)
  → Invoice: paidAmount = 7,000, outstanding = 3,000, status = "sent"

Payment 3: 3,000 AED (status: pending)
  → Invoice: paidAmount = 10,000, outstanding = 0, status = "paid" ✅
```

---

## Key Points

### 1. **Invoice Status is Automatic (Based on Payment Amount)**
   - When you create a payment, the invoice status updates automatically
   - If fully paid → `paid`
   - If partially paid → `sent` (unless it was `draft`)
   - You can still manually change invoice status if needed

### 2. **Payment Status is Independent**
   - Payment status (`pending`, `confirmed`, etc.) does NOT automatically change invoice status
   - Payment status is about whether the payment itself is verified
   - Invoice status is about whether the invoice is fully paid

### 3. **Manual Status Changes**
   - **Invoice Status:** Can be changed manually in Invoices page dropdown (draft, sent, viewed, paid, overdue, cancelled)
   - **Payment Status:** Can only be changed from `pending` to `confirmed` via the "Confirm" button in Payments page
     - Note: The system supports other statuses (`failed`, `cancelled`, `refunded`) in the database, but the UI currently only provides the "Confirm" action

### 4. **Invoice Status Logic**
   ```javascript
   if (outstanding <= 0.01) {
     status = 'paid'  // Fully paid
   } else if (currentStatus === 'draft') {
     status = 'draft'  // Keep as draft
   } else {
     status = 'sent'  // Partially paid or unpaid
   }
   ```

---

## Database Fields

### Invoice Table
- `status` - ENUM('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')
- `paidAmount` - DECIMAL (sum of all payments)
- `outstandingAmount` - DECIMAL (totalWithVAT - paidAmount)

### Payment Table
- `status` - ENUM('pending', 'confirmed', 'failed', 'cancelled', 'refunded')
- `paymentAmount` - DECIMAL
- `invoiceId` - Foreign key to Invoice

### Payment Allocation Table
- Links payments to invoices
- Tracks how much of each payment is allocated to each invoice

---

## Visual Flow

```
┌─────────────────┐
│  Create Invoice │
│  Status: draft  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send Invoice   │
│  Status: sent   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Create Payment (3,000 AED)         │
│  Payment Status: pending            │
│  ↓                                  │
│  Invoice Updates:                   │
│  - paidAmount: 3,000                │
│  - outstandingAmount: 7,000          │
│  - status: sent (not fully paid)   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Create Payment (7,000 AED)          │
│  Payment Status: pending             │
│  ↓                                   │
│  Invoice Updates:                   │
│  - paidAmount: 10,000                │
│  - outstandingAmount: 0              │
│  - status: paid ✅ (fully paid!)    │
└──────────────────────────────────────┘
```

---

## Summary

- **Invoice Status** = Overall state of the invoice (draft, sent, paid, overdue, etc.)
- **Payment Status** = State of individual payments (pending, confirmed, failed, etc.)
- **Connection:** When you create a payment, the system automatically:
  1. Adds payment amount to invoice's `paidAmount`
  2. Recalculates `outstandingAmount`
  3. Updates invoice `status` to `paid` if fully paid, otherwise `sent`
- **Independence:** Payment status doesn't directly affect invoice status - it's the payment **amount** that matters

---

## Code References

- **Invoice Status Update:** `server/services/paymentService.js` → `allocatePaymentToInvoice()` (line 225-226)
- **Payment Creation:** `server/services/paymentService.js` → `createPayment()`
- **Payment Confirmation:** `server/services/paymentService.js` → `confirmPayment()`
- **Invoice Model:** `models/Invoice.js` (line 127-130)
- **Payment Model:** `models/Payment.js` (line 58-62)

