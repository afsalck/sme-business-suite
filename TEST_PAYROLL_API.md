# Testing Payroll API Endpoints

## Prerequisites

1. **Database Migration**: Run `server/create-payroll-module.sql` first
2. **Server Running**: Make sure your server is running on port 5004
3. **Authentication Token**: You need a Firebase authentication token

## Getting Your Authentication Token

1. Open your browser and go to your application
2. Open Developer Tools (F12)
3. Go to Application/Storage → Local Storage
4. Find the Firebase auth token (usually stored as `firebase:authUser:...`)
5. Or check Network tab when making API calls to see the `Authorization: Bearer <token>` header

## Testing Methods

### Method 1: Using Postman (Recommended)

#### Setup Postman:
1. Download Postman: https://www.postman.com/downloads/
2. Create a new collection: "Payroll API Tests"
3. Set up environment variables:
   - `baseUrl`: `http://localhost:5004`
   - `token`: Your Firebase auth token

#### Test Endpoints:

**1. Get Payroll Periods**
```
GET {{baseUrl}}/api/payroll/periods
Headers:
  Authorization: Bearer {{token}}
```

**2. Create Payroll Period**
```
POST {{baseUrl}}/api/payroll/periods
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json

Body (JSON):
{
  "periodName": "December 2025",
  "periodType": "monthly",
  "startDate": "2025-12-01",
  "endDate": "2025-12-31",
  "payDate": "2026-01-05"
}
```

**3. Process Payroll**
```
POST {{baseUrl}}/api/payroll/process
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json

Body (JSON):
{
  "payrollPeriodId": 1,
  "employeeIds": [1, 2, 3]  // Optional: specific employees, or omit for all
}
```

**4. Get Payroll Records**
```
GET {{baseUrl}}/api/payroll/records?payrollPeriodId=1
Headers:
  Authorization: Bearer {{token}}
```

**5. Approve Payroll Record**
```
POST {{baseUrl}}/api/payroll/records/1/approve
Headers:
  Authorization: Bearer {{token}}
```

**6. Mark Payroll as Paid**
```
POST {{baseUrl}}/api/payroll/records/1/mark-paid
Headers:
  Authorization: Bearer {{token}}
```

**7. Generate Payslip PDF**
```
GET {{baseUrl}}/api/payroll/records/1/payslip
Headers:
  Authorization: Bearer {{token}}
```
(Response will be a PDF file)

**8. Get Employee Salary Structure**
```
GET {{baseUrl}}/api/payroll/employees/1/salary-structure
Headers:
  Authorization: Bearer {{token}}
```

**9. Save Employee Salary Structure**
```
POST {{baseUrl}}/api/payroll/employees/1/salary-structure
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json

Body (JSON):
{
  "basicSalary": 5000,
  "housingAllowance": 2000,
  "transportAllowance": 500,
  "foodAllowance": 300,
  "medicalAllowance": 200,
  "otherAllowances": 0,
  "incomeTaxRate": 0,
  "socialSecurityRate": 0,
  "gratuityEligible": true,
  "annualLeaveDays": 30,
  "overtimeEligible": true,
  "overtimeRate": 1.25,
  "bankName": "Emirates NBD",
  "bankAccountNumber": "1234567890",
  "iban": "AE123456789012345678901"
}
```

---

### Method 2: Using cURL (Command Line)

Replace `YOUR_TOKEN` with your actual Firebase token.

**1. Get Payroll Periods**
```bash
curl -X GET "http://localhost:5004/api/payroll/periods" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**2. Create Payroll Period**
```bash
curl -X POST "http://localhost:5004/api/payroll/periods" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "periodName": "December 2025",
    "periodType": "monthly",
    "startDate": "2025-12-01",
    "endDate": "2025-12-31",
    "payDate": "2026-01-05"
  }'
```

**3. Process Payroll**
```bash
curl -X POST "http://localhost:5004/api/payroll/process" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payrollPeriodId": 1
  }'
```

**4. Get Payroll Records**
```bash
curl -X GET "http://localhost:5004/api/payroll/records?payrollPeriodId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**5. Generate Payslip PDF**
```bash
curl -X GET "http://localhost:5004/api/payroll/records/1/payslip" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output payslip.pdf
```

---

### Method 3: Using Browser (GET requests only)

For GET requests, you can use the browser console:

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Run this JavaScript:

```javascript
// Replace with your actual token
const token = 'YOUR_FIREBASE_TOKEN';

// Get Payroll Periods
fetch('http://localhost:5004/api/payroll/periods', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => console.log('Payroll Periods:', data))
.catch(err => console.error('Error:', err));

// Get Payroll Records
fetch('http://localhost:5004/api/payroll/records?payrollPeriodId=1', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => console.log('Payroll Records:', data))
.catch(err => console.error('Error:', err));
```

---

### Method 4: Using a Simple Test Script

Create a file `test-payroll-api.js`:

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:5004';
const TOKEN = 'YOUR_FIREBASE_TOKEN'; // Replace with your token

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testPayrollAPI() {
  try {
    console.log('1. Creating Payroll Period...');
    const period = await api.post('/api/payroll/periods', {
      periodName: 'December 2025',
      periodType: 'monthly',
      startDate: '2025-12-01',
      endDate: '2025-12-31',
      payDate: '2026-01-05'
    });
    console.log('✓ Period created:', period.data);
    const periodId = period.data.id;

    console.log('\n2. Processing Payroll...');
    const payroll = await api.post('/api/payroll/process', {
      payrollPeriodId: periodId
    });
    console.log('✓ Payroll processed:', payroll.data);

    console.log('\n3. Getting Payroll Records...');
    const records = await api.get(`/api/payroll/records?payrollPeriodId=${periodId}`);
    console.log('✓ Records:', records.data);

    if (records.data.length > 0) {
      const recordId = records.data[0].id;
      
      console.log('\n4. Approving Payroll Record...');
      await api.post(`/api/payroll/records/${recordId}/approve`);
      console.log('✓ Record approved');

      console.log('\n5. Generating Payslip...');
      const payslip = await api.get(`/api/payroll/records/${recordId}/payslip`, {
        responseType: 'arraybuffer'
      });
      console.log('✓ Payslip generated (PDF size:', payslip.data.byteLength, 'bytes)');
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPayrollAPI();
```

Run it:
```bash
npm install axios
node test-payroll-api.js
```

---

## Step-by-Step Testing Workflow

### 1. Setup Employee Salary Structure First

Before processing payroll, employees need salary structures:

```bash
# Create salary structure for employee ID 1
curl -X POST "http://localhost:5004/api/payroll/employees/1/salary-structure" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "basicSalary": 5000,
    "housingAllowance": 2000,
    "transportAllowance": 500,
    "gratuityEligible": true,
    "annualLeaveDays": 30
  }'
```

### 2. Create Payroll Period

```bash
curl -X POST "http://localhost:5004/api/payroll/periods" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "periodName": "December 2025",
    "periodType": "monthly",
    "startDate": "2025-12-01",
    "endDate": "2025-12-31",
    "payDate": "2026-01-05"
  }'
```

Note the `id` from the response (e.g., `1`)

### 3. Process Payroll

```bash
curl -X POST "http://localhost:5004/api/payroll/process" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payrollPeriodId": 1
  }'
```

### 4. View Payroll Records

```bash
curl -X GET "http://localhost:5004/api/payroll/records?payrollPeriodId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Approve and Generate Payslip

```bash
# Approve
curl -X POST "http://localhost:5004/api/payroll/records/1/approve" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate payslip (saves to file)
curl -X GET "http://localhost:5004/api/payroll/records/1/payslip" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output payslip-1.pdf
```

---

## Expected Responses

### Success Response (Create Period):
```json
{
  "id": 1,
  "companyId": 1,
  "periodName": "December 2025",
  "periodType": "monthly",
  "startDate": "2025-12-01T00:00:00.000Z",
  "endDate": "2025-12-31T00:00:00.000Z",
  "payDate": "2026-01-05T00:00:00.000Z",
  "status": "draft"
}
```

### Success Response (Process Payroll):
```json
{
  "period": { ... },
  "records": [
    {
      "id": 1,
      "employeeId": 1,
      "basicSalary": 5000,
      "grossSalary": 7500,
      "netSalary": 7500,
      "totalPayable": 7500,
      "status": "draft"
    }
  ],
  "totalEmployees": 1,
  "totalAmount": 7500
}
```

### Error Response:
```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## Troubleshooting

### 401 Unauthorized
- Check your Firebase token is valid
- Make sure token is in `Authorization: Bearer <token>` format

### 404 Not Found
- Check server is running on port 5004
- Verify route path is correct
- Check server logs for route loading

### 500 Internal Server Error
- Check server console for error details
- Verify database migration was run
- Check database connection

### No Payroll Records Created
- Ensure employees have salary structures
- Check employee `basicSalary` is > 0
- Verify payroll period dates are correct

---

## Quick Test Checklist

- [ ] Database migration completed
- [ ] Server running and routes loaded
- [ ] Firebase token obtained
- [ ] Employee salary structure created
- [ ] Payroll period created
- [ ] Payroll processed successfully
- [ ] Payroll records visible
- [ ] Payslip PDF generated

---

## Tips

1. **Use Postman Collections**: Save all requests in a Postman collection for easy reuse
2. **Check Server Logs**: Watch server console for detailed error messages
3. **Test One Step at a Time**: Don't skip steps - each depends on the previous
4. **Verify Database**: Check SQL Server to see if data is being saved correctly
5. **Test with Real Data**: Use actual employee IDs and dates from your database

Happy Testing! 🚀

