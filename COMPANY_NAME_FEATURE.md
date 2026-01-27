# 🏢 Company Name Feature

This feature allows different businesses to see and configure their own company/shop name when using the software.

---

## ✅ What's Implemented

### 1. **Company Model** (`models/Company.js`)
- Stores company information per `companyId`
- Fields: `name`, `shopName`, `address`, `trn`, `email`, `phone`, `website`, `logo`
- Auto-creates default company if none exists

### 2. **API Endpoints** (`routes/companyRoutes.js`)
- `GET /api/company` - Get company information
- `PUT /api/company` - Update company information (admin only)

### 3. **React Hook** (`client/src/hooks/useCompany.js`)
- `useCompany()` hook to fetch and manage company data
- Provides `displayName` (shopName if available, otherwise name)
- `updateCompany()` function for admins to update settings

### 4. **UI Components Updated**
- **Sidebar**: Shows company/shop name instead of hardcoded "BizEase UAE"
- **Topbar**: Ready to display company name (currently shows user info)

### 5. **Company Settings Page** (`client/src/pages/CompanySettingsPage.js`)
- Admin-only page to configure company information
- Accessible at `/company/settings`
- Shows in sidebar navigation for admins

---

## 🎯 How It Works

### Display Logic:
1. **Shop Name** is shown in the sidebar if set
2. If **Shop Name** is empty, **Company Name** is shown
3. If neither exists, defaults to "BizEase UAE"

### For Different Businesses:
- Each business can set their own **Company Name** (for invoices/documents)
- Each business can set their own **Shop Name** (for display in sidebar)
- All data is stored per `companyId` (currently defaults to 1)

---

## 📝 Usage

### For Admins:

1. **Access Company Settings:**
   - Navigate to "Company Settings" in the sidebar (admin only)
   - Or go to: `/company/settings`

2. **Configure Company:**
   - **Company Name**: Official name (used in invoices, receipts, documents)
   - **Shop Name**: Display name shown in sidebar (optional)
   - **Other fields**: Address, TRN, Email, Phone, Website

3. **Save:**
   - Click "Save Settings"
   - Changes take effect immediately
   - Sidebar will update to show the new shop/company name

### For All Users:
- Company/Shop name automatically appears in the sidebar
- No action needed - it's visible to everyone

---

## 🔧 Technical Details

### Database Table:
```sql
CREATE TABLE companies (
  id INT PRIMARY KEY IDENTITY(1,1),
  companyId INT NOT NULL UNIQUE DEFAULT 1,
  name NVARCHAR(255) NOT NULL DEFAULT 'BizEase UAE',
  shopName NVARCHAR(255) NULL,
  address NTEXT NULL,
  trn NVARCHAR(50) NULL,
  email NVARCHAR(255) NULL,
  phone NVARCHAR(50) NULL,
  website NVARCHAR(255) NULL,
  logo NVARCHAR(500) NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

### API Endpoints:

**GET /api/company**
```json
Response:
{
  "id": 1,
  "companyId": 1,
  "name": "ABC Trading LLC",
  "shopName": "My Shop",
  "address": "Dubai, UAE",
  "trn": "TRN123456789",
  "email": "info@abc.ae",
  "phone": "+971 4 XXX XXXX",
  "website": "www.abc.ae"
}
```

**PUT /api/company** (Admin only)
```json
Request Body:
{
  "name": "ABC Trading LLC",
  "shopName": "My Shop",
  "address": "Dubai, UAE",
  "trn": "TRN123456789",
  "email": "info@abc.ae",
  "phone": "+971 4 XXX XXXX",
  "website": "www.abc.ae"
}
```

---

## 🚀 Future Enhancements

1. **Multi-Company Support:**
   - Allow users to switch between companies
   - Support multiple `companyId` values
   - Company selection dropdown

2. **Logo Upload:**
   - Add logo upload functionality
   - Display logo in sidebar and invoices

3. **Company-Specific Branding:**
   - Custom colors per company
   - Custom themes

4. **PDF Integration:**
   - Use company name from database in PDF generation
   - Replace hardcoded company config

---

## 📋 Files Changed

### Backend:
- `models/Company.js` - New model
- `routes/companyRoutes.js` - New routes
- `server/index.js` - Added company routes

### Frontend:
- `client/src/hooks/useCompany.js` - New hook
- `client/src/components/Sidebar.js` - Shows company name
- `client/src/components/Topbar.js` - Ready for company name
- `client/src/pages/CompanySettingsPage.js` - New settings page
- `client/src/App.js` - Added company settings route

---

## ✅ Testing Checklist

- [ ] Company name appears in sidebar
- [ ] Admin can access Company Settings page
- [ ] Admin can update company name
- [ ] Sidebar updates immediately after saving
- [ ] Shop name takes priority over company name
- [ ] Default "BizEase UAE" shows if no company configured
- [ ] Non-admin users cannot access settings page
- [ ] API endpoints work correctly

---

## 🆘 Troubleshooting

### Company name not showing:
1. Check if company record exists in database
2. Verify API endpoint `/api/company` is accessible
3. Check browser console for errors
4. Ensure `useCompany` hook is loading correctly

### Cannot save company settings:
1. Verify user has admin role
2. Check API endpoint `/api/company` (PUT) is accessible
3. Check server logs for errors
4. Verify database connection

### Sidebar shows "BizEase UAE" instead of company name:
1. Check if company record exists
2. Verify `shopName` or `name` field has a value
3. Check `useCompany` hook is returning data
4. Clear browser cache and reload

---

**Last Updated:** 2025-01-05  
**Version:** 1.0
