# 📋 Complete API Endpoints List

## 🔐 Authentication Required

All endpoints below require Firebase Bearer token in the `Authorization` header:
```
Authorization: Bearer <firebase-id-token>
```

## 📍 Base URL
```
http://localhost:5004/api
```

---

## 🏠 Dashboard

### Get Dashboard Metrics
```
GET /api/dashboard/metrics
```
**Description:** Get dashboard statistics including sales, expenses, profit, VAT, and trends.

**Query Parameters:**
- `from` (optional): Start date (YYYY-MM-DD)
- `to` (optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "totals": {
    "totalSales": 0,
    "totalExpenses": 0,
    "profit": 0,
    "vatPayable": 0,
    "expiringDocs": 0
  },
  "charts": {
    "salesTrend": [],
    "expenseTrend": []
  }
}
```

---

## 👥 Employees

### Get All Employees
```
GET /api/employees
```

### Create Employee
```
POST /api/employees
```
**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+971501234567",
  "position": "Manager",
  "department": "Sales",
  "salary": 5000,
  "visaExpiry": "2025-12-31",
  "passportExpiry": "2026-06-30"
}
```
**Roles:** `admin`, `staff`

### Update Employee
```
PUT /api/employees/:id
```
**Roles:** `admin`

### Delete Employee
```
DELETE /api/employees/:id
```
**Roles:** `admin`

---

## 📄 Invoices

### Get All Invoices
```
GET /api/invoices
```
**Query Parameters:**
- `from` (optional): Start date
- `to` (optional): End date
- `customer` (optional): Customer name filter

### Get Invoice by ID
```
GET /api/invoices/:id
```

### Create Invoice
```
POST /api/invoices
```
**Body:**
```json
{
  "invoiceNumber": "INV-001",
  "customerName": "ABC Company",
  "customerEmail": "contact@abc.com",
  "issueDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "items": "[{\"description\":\"Service\",\"quantity\":1,\"price\":1000}]",
  "status": "draft"
}
```
**Roles:** `admin`, `staff`

### Update Invoice
```
PUT /api/invoices/:id
```
**Roles:** `admin`, `staff`

### Delete Invoice
```
DELETE /api/invoices/:id
```
**Roles:** `admin`

---

## 💰 Expenses

### Get All Expenses
```
GET /api/expenses
```

### Create Expense
```
POST /api/expenses
```
**Body:**
```json
{
  "description": "Office Supplies",
  "amount": 500,
  "category": "Office",
  "date": "2024-01-15",
  "paymentMethod": "Credit Card"
}
```
**Roles:** `admin`, `staff`

### Update Expense
```
PUT /api/expenses/:id
```
**Roles:** `admin`

### Delete Expense
```
DELETE /api/expenses/:id
```
**Roles:** `admin`

---

## 📦 Inventory

### Get All Inventory Items
```
GET /api/inventory
```

### Create Inventory Item
```
POST /api/inventory
```
**Body:**
```json
{
  "name": "Product Name",
  "sku": "SKU-001",
  "stock": 100,
  "costPrice": 50,
  "salePrice": 100,
  "reorderLevel": 20
}
```
**Roles:** `admin`

### Update Inventory Item
```
PUT /api/inventory/:id
```
**Roles:** `admin`

### Delete Inventory Item
```
DELETE /api/inventory/:id
```
**Roles:** `admin`

### Get All Sales
```
GET /api/inventory/sales
```

### Create Sale
```
POST /api/inventory/sales
```
**Body:**
```json
{
  "date": "2024-01-15",
  "items": "[{\"itemId\":1,\"quantity\":2,\"price\":100}]",
  "summary": "Sale summary",
  "notes": "Additional notes"
}
```
**Roles:** `admin`, `staff`

---

## 👤 Auth

### Get Current User
```
GET /api/auth/me
```
**Response:**
```json
{
  "user": {
    "uid": "...",
    "email": "user@example.com",
    "displayName": "User Name",
    "role": "staff"
  }
}
```

### Get All Users (Admin Only)
```
GET /api/auth/users
```
**Roles:** `admin`

### Update User Role (Admin Only)
```
PATCH /api/auth/users/:uid/role
```
**Body:**
```json
{
  "role": "admin"
}
```
**Roles:** `admin`

---

## 🏥 Health Check (No Auth Required)

### Server Health
```
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "database": {
    "type": "SQL Server",
    "state": "connected",
    "ping": 10
  }
}
```

---

## 📚 Swagger Documentation

Access interactive API documentation at:
```
http://localhost:5004/api-docs
```

---

## 🔍 Debugging

See `DEBUG_DASHBOARD_API.md` for detailed debugging guide with all log outputs.

