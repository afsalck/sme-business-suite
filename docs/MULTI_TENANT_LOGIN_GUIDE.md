# Multi-Tenant Login & User Creation Guide

## ✅ Yes! You Can Fetch Data Using companyId

Once you implement multi-tenancy, you fetch data like this:

```javascript
// Get invoices for specific company
const invoices = await Invoice.findAll({
  where: { companyId: 1 }  // Customer A's data
});

// Get items for specific company
const items = await InventoryItem.findAll({
  where: { companyId: 2 }  // Customer B's data
});
```

**Each customer's data is isolated by `companyId`!**

---

## 🔐 How Login Creation Works in Multi-Tenant System

### Current State (Single Tenant)

**Right now:**
- Users don't have `companyId`
- All users see the same data
- No company association

### Multi-Tenant Solution

**Each user must belong to a company:**

```
User → companyId → Data Access
```

---

## 📋 Step-by-Step: User Creation & Login Flow

### Step 1: Add companyId to User Model

```javascript
// models/User.js
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // ... existing fields
  
  // ✅ ADD THIS
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    references: {
      model: 'companies',
      key: 'companyId'
    }
  }
});
```

### Step 2: Database Migration

```sql
-- Add companyId to users table
ALTER TABLE users ADD companyId INT NOT NULL DEFAULT 1;

-- Add foreign key
ALTER TABLE users 
ADD CONSTRAINT FK_User_Company 
FOREIGN KEY (companyId) REFERENCES companies(companyId);

-- Create index
CREATE INDEX IX_Users_CompanyId ON users(companyId);
```

### Step 3: User Registration - Assign to Company

#### Option A: Admin Creates Users (Recommended)

```javascript
// routes/authRoutes.js or routes/userRoutes.js
router.post('/users', authorizeRole('admin'), async (req, res) => {
  try {
    const { email, displayName, role, companyId } = req.body;
    
    // Validate company exists
    const company = await Company.findOne({ 
      where: { companyId: companyId } 
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Create Firebase user (your existing logic)
    const firebaseUser = await admin.auth().createUser({
      email,
      displayName,
      // ... other Firebase fields
    });
    
    // Create user in database with companyId
    const user = await User.create({
      uid: firebaseUser.uid,
      email,
      displayName,
      role: role || 'staff',
      companyId: companyId  // ✅ Assign to company
    });
    
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

#### Option B: Self-Registration with Company Code

```javascript
// User registers with company code
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, companyCode } = req.body;
    
    // Find company by code
    const company = await Company.findOne({
      where: { companyCode: companyCode }  // You'd need to add this field
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Invalid company code' });
    }
    
    // Create Firebase user
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName
    });
    
    // Create user with companyId
    const user = await User.create({
      uid: firebaseUser.uid,
      email,
      displayName,
      role: 'staff',  // Default role
      companyId: company.companyId  // ✅ Assign to company
    });
    
    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

#### Option C: Invitation-Based Registration

```javascript
// Admin sends invitation with company link
router.post('/invite', authorizeRole('admin'), async (req, res) => {
  try {
    const { email, companyId, role } = req.body;
    
    // Create invitation token
    const invitationToken = generateToken();
    
    // Store invitation
    await Invitation.create({
      email,
      companyId,
      role,
      token: invitationToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    // Send email with invitation link
    await sendInvitationEmail(email, {
      companyId,
      invitationLink: `https://app.bizease.com/register?token=${invitationToken}`
    });
    
    res.json({ message: 'Invitation sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User accepts invitation
router.post('/register', async (req, res) => {
  try {
    const { token, password, displayName } = req.body;
    
    // Find invitation
    const invitation = await Invitation.findOne({
      where: { token, used: false, expiresAt: { [Op.gt]: new Date() } }
    });
    
    if (!invitation) {
      return res.status(400).json({ message: 'Invalid or expired invitation' });
    }
    
    // Create Firebase user
    const firebaseUser = await admin.auth().createUser({
      email: invitation.email,
      password,
      displayName
    });
    
    // Create user with companyId from invitation
    const user = await User.create({
      uid: firebaseUser.uid,
      email: invitation.email,
      displayName,
      role: invitation.role,
      companyId: invitation.companyId  // ✅ From invitation
    });
    
    // Mark invitation as used
    await invitation.update({ used: true });
    
    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

---

## 🔑 Login Flow with Multi-Tenancy

### Step 1: User Logs In (Firebase Auth)

```javascript
// Client-side (React)
const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  
  // Send token to backend
  const response = await apiClient.post('/auth/login', { token });
  return response.data;
};
```

### Step 2: Backend Verifies Token & Gets User

```javascript
// routes/authRoutes.js
router.post('/login', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    
    // Get user from database (includes companyId)
    const user = await User.findOne({
      where: { uid: firebaseUid },
      include: [{
        model: Company,
        as: 'company',
        where: { companyId: sequelize.col('User.companyId') }
      }]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user with companyId
    res.json({
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        companyId: user.companyId,  // ✅ Include companyId
        company: user.company
      },
      token: token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

### Step 3: Store companyId in Context/Session

```javascript
// Client-side: Store companyId
const { user } = await login(email, password);
localStorage.setItem('companyId', user.companyId);

// Or in React Context
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  
  const login = async (email, password) => {
    const userData = await loginUser(email, password);
    setUser(userData.user);
    setCompanyId(userData.user.companyId);  // ✅ Store companyId
  };
  
  return (
    <AuthContext.Provider value={{ user, companyId }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Step 4: Use companyId in All API Calls

```javascript
// Middleware: Add companyId to all requests
apiClient.interceptors.request.use((config) => {
  const companyId = localStorage.getItem('companyId');
  if (companyId) {
    config.headers['X-Company-Id'] = companyId;  // Send in header
  }
  return config;
});

// Or include in request body
const invoices = await apiClient.get('/api/invoices', {
  params: { companyId: user.companyId }
});
```

### Step 5: Backend Filters by companyId

```javascript
// routes/invoiceRoutes.js
router.get('/', setTenantContext, async (req, res) => {
  try {
    // Get companyId from request (set by middleware)
    const companyId = req.companyId;
    
    // Filter invoices by companyId
    const invoices = await Invoice.findAll({
      where: { companyId: companyId }  // ✅ Only this company's data
    });
    
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

---

## 🛡️ Middleware: Set Tenant Context

```javascript
// server/middleware/tenantMiddleware.js
const User = require('../models/User');

async function setTenantContext(req, res, next) {
  try {
    // Method 1: From authenticated user
    if (req.user && req.user.uid) {
      const user = await User.findOne({
        where: { uid: req.user.uid }
      });
      
      if (user) {
        req.companyId = user.companyId;
        req.userId = user.id;
      } else {
        return res.status(404).json({ message: 'User not found' });
      }
    }
    
    // Method 2: From header (if sent from client)
    else if (req.headers['x-company-id']) {
      req.companyId = parseInt(req.headers['x-company-id']);
    }
    
    // Method 3: From query parameter (less secure, not recommended)
    else if (req.query.companyId) {
      req.companyId = parseInt(req.query.companyId);
    }
    
    // Validate companyId exists
    if (!req.companyId) {
      return res.status(401).json({ 
        message: 'Company context required. Please log in again.' 
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { setTenantContext };
```

**Apply to all routes:**
```javascript
// routes/invoiceRoutes.js
const { setTenantContext } = require('../middleware/tenantMiddleware');

router.get('/', setTenantContext, async (req, res) => {
  // req.companyId is now available
});

router.post('/', setTenantContext, async (req, res) => {
  // Create with companyId
  const invoice = await Invoice.create({
    ...req.body,
    companyId: req.companyId
  });
});
```

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────┐
│  1. Admin Creates Company                │
│     - Company ID = 1 (Customer A)       │
│     - Company ID = 2 (Customer B)       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Admin Creates Users                  │
│     - User A → companyId = 1            │
│     - User B → companyId = 2            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. User Logs In                        │
│     - Firebase Auth                     │
│     - Get user from DB                  │
│     - Get companyId from user           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. Store companyId in Client            │
│     - localStorage / Context             │
│     - Send in API headers               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. Backend Filters by companyId         │
│     - WHERE companyId = req.companyId   │
│     - Only return that company's data   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  6. User Sees Only Their Data            │
│     - Customer A sees companyId = 1     │
│     - Customer B sees companyId = 2     │
└─────────────────────────────────────────┘
```

---

## 🔍 Example: Complete User Creation

```javascript
// Admin creates user for Customer A
POST /api/users
{
  "email": "user@customera.com",
  "displayName": "John Doe",
  "role": "staff",
  "companyId": 1  // Customer A
}

// Backend creates:
// 1. Firebase user
// 2. Database user with companyId = 1

// When user logs in:
// 1. Firebase auth
// 2. Get user from DB (companyId = 1)
// 3. All queries filter: WHERE companyId = 1
// 4. User sees only Customer A's data
```

---

## ✅ Summary

**Question 1: "Can I fetch data using companyId?"**
- ✅ **YES!** All queries filter by `companyId`
- Example: `WHERE companyId = 1` → Only Customer A's data

**Question 2: "How does login creation work?"**
1. **User Creation:**
   - Admin creates user → Assigns `companyId`
   - OR User registers → Provides company code → Gets `companyId`
   - OR User accepts invitation → Gets `companyId` from invitation

2. **Login:**
   - User logs in via Firebase
   - Backend gets user from DB (includes `companyId`)
   - Store `companyId` in client
   - Send `companyId` in all API requests

3. **Data Access:**
   - Backend filters all queries by `companyId`
   - User only sees their company's data

**Key Point:**
> **Every user must have a `companyId`. This `companyId` determines which data they can see.**

---

## 🚀 Quick Implementation

1. **Add companyId to User model**
2. **Update registration to assign companyId**
3. **Update login to return companyId**
4. **Create middleware to set companyId from user**
5. **Filter all queries by companyId**

Result: Each customer's users only see their own data! ✅

