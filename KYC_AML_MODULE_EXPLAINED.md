# KYC/AML Module - How It Works

## Overview

The KYC/AML (Know Your Customer / Anti-Money Laundering) module is a compliance system designed to help UAE businesses onboard clients safely, verify their identity, and screen them against sanctions and PEP (Politically Exposed Person) lists.

## Core Workflow

### 1. Client Onboarding

**Step 1: Create Client Profile**
- User clicks "+ New Client" in the KYC/AML Clients page
- Fills in basic information:
  - **Individual**: Name, email, phone, Emirates ID or Passport
  - **Company**: Company name, trade license, contact details
- System automatically:
  - Calculates initial **risk score** (0-100)
  - Categorizes risk as **low**, **medium**, or **high**
  - Sets KYC status to **"pending"**
  - Sets AML status to **"pending"**

**Risk Scoring Factors:**
- High-risk countries: +20 points
- Missing identification documents: +15 points
- Company without trade license: +10 points
- Missing address: +5 points
- PEP (Politically Exposed Person) status: +30 points

### 2. Document Collection

**Step 2: Upload Documents**
- User uploads required documents:
  - Passport
  - Emirates ID
  - Trade License (for companies)
  - Proof of Address
  - Bank Statement
  - Other supporting documents
- Documents are stored securely in `uploads/kyc-documents/`
- Document status: **"pending"** → **"verified"** → **"rejected"**

**Step 3: Document Verification**
- Admin/Accountant reviews uploaded documents
- Clicks "Verify" on each document
- Adds verification notes (optional)
- Document status changes to **"verified"**

### 3. KYC Status Management

**Status Workflow:**
```
pending → in_review → approved/rejected
```

**Actions:**
- **Pending**: Initial state after client creation
- **In Review**: Admin starts reviewing the client
- **Approved**: Client passes KYC verification
- **Rejected**: Client fails KYC verification

### 4. AML Screening

**Step 4: Perform AML Screening**
- Admin clicks "Screen" button on a client
- System performs checks against:
  - **Sanctions Lists**: UN, OFAC, EU sanctions
  - **PEP Database**: Politically Exposed Persons
  - **Watchlists**: Other compliance databases

**Screening Process:**
1. System checks client name against lists
2. Calculates **match score** (0-100):
   - **Exact match**: 95 points
   - **Partial match**: 60 points
3. Makes decision:
   - **Cleared**: No match or low confidence (<50)
   - **Flagged**: Medium confidence (50-79)
   - **Blocked**: High confidence (≥80)

**AML Status:**
- **Pending**: Not yet screened
- **Cleared**: No issues found
- **Flagged**: Potential match, needs review
- **Blocked**: Confirmed match, client blocked

### 5. Risk Assessment

**Automatic Risk Calculation:**
- Risk score calculated on client creation
- Updated based on:
  - Document completeness
  - AML screening results
  - PEP status
  - Country of origin

**Risk Categories:**
- **Low Risk** (0-39): Standard onboarding
- **Medium Risk** (40-69): Enhanced due diligence
- **High Risk** (70-100): Requires senior approval

## Key Features

### 1. Client Management
- **Individual Clients**: Personal identification and verification
- **Company Clients**: Business registration and trade license verification
- **Dual Support**: Handles both individual and corporate clients

### 2. Document Management
- **Secure Storage**: Documents stored in encrypted file system
- **Version Control**: Track document uploads and updates
- **Expiry Tracking**: Monitor document expiration dates
- **Verification Workflow**: Multi-step verification process

### 3. AML Screening
- **Automated Screening**: Check against multiple lists
- **Match Scoring**: Confidence level for matches
- **Decision Support**: Clear/Flag/Block recommendations
- **Audit Trail**: Complete history of all screenings

### 4. Compliance Features
- **Audit Log**: Every action is logged
- **Status Tracking**: Real-time status updates
- **Risk Scoring**: Automatic risk assessment
- **Compliance Reports**: Exportable compliance data

## Technical Architecture

### Database Structure

**1. `clients` Table**
- Stores client profiles
- Tracks KYC and AML status
- Stores risk scores and categories
- Links to documents and screenings

**2. `kyc_documents` Table**
- Stores document metadata
- Tracks verification status
- Links to file storage
- Records expiry dates

**3. `aml_screenings` Table**
- Stores screening results
- Tracks match scores
- Records decisions
- Links to screening sources

**4. `kyc_audit_log` Table**
- Complete audit trail
- Tracks all actions
- Records who did what and when
- Compliance reporting

### Service Layer

**`kycService.js`**
- Client creation and management
- Document upload and verification
- KYC status updates
- Risk score calculation

**`amlService.js`**
- AML screening execution
- Sanctions list checking
- PEP database checking
- Match scoring and decision making

### API Endpoints

**Client Management:**
- `GET /api/kyc` - List all clients (with filters)
- `POST /api/kyc` - Create new client
- `GET /api/kyc/:id` - Get client details
- `PUT /api/kyc/:id/kyc-status` - Update KYC status

**Document Management:**
- `POST /api/kyc/:id/documents` - Upload document
- `PUT /api/kyc/documents/:id/verify` - Verify document
- `GET /api/kyc/documents/:id/download` - Download document

**AML Screening:**
- `POST /api/kyc/:id/aml-screening` - Perform screening
- `GET /api/kyc/:id/aml-screenings` - Get screening history
- `PUT /api/kyc/aml-screenings/:id/decision` - Update decision

## User Workflow Example

### Scenario: Onboarding a New Individual Client

1. **Create Client**
   - Admin fills in: Name, Email, Phone, Emirates ID
   - System calculates risk score: 5 (low risk)
   - Status: KYC = "pending", AML = "pending"

2. **Upload Documents**
   - Admin uploads: Passport, Emirates ID, Proof of Address
   - Documents stored with status: "pending"

3. **Verify Documents**
   - Admin reviews each document
   - Marks as "verified"
   - All documents verified

4. **Update KYC Status**
   - Admin changes status: "pending" → "in_review"
   - Reviews all information
   - Changes status: "in_review" → "approved"

5. **Perform AML Screening**
   - Admin clicks "Screen"
   - System checks against sanctions/PEP lists
   - Result: No match found
   - AML status: "pending" → "cleared"

6. **Client Approved**
   - KYC Status: "approved"
   - AML Status: "cleared"
   - Risk Category: "low"
   - Client can now do business

## Compliance Benefits

### For UAE Businesses

1. **Regulatory Compliance**
   - Meets UAE Central Bank requirements
   - Supports AML/CFT regulations
   - Maintains audit trail

2. **Risk Management**
   - Identifies high-risk clients early
   - Prevents onboarding of sanctioned individuals
   - Reduces compliance violations

3. **Operational Efficiency**
   - Automated risk scoring
   - Streamlined document management
   - Centralized compliance tracking

4. **Audit Readiness**
   - Complete audit trail
   - Documented decisions
   - Compliance reports

## Current Implementation vs. Production

### Current (Basic Implementation)
- ✅ Client onboarding
- ✅ Document management
- ✅ Basic AML screening (demo lists)
- ✅ Risk scoring
- ✅ Audit trail

### Production Enhancements Needed
- 🔄 **Real AML Services**: Integrate with Dow Jones, World-Check, Refinitiv
- 🔄 **UAE Pass Integration**: Automated identity verification
- 🔄 **OCR Technology**: Automatic document reading
- 🔄 **Enhanced Screening**: Real-time API connections
- 🔄 **Compliance Reporting**: Automated report generation

## Security Features

1. **Access Control**: Only admins and accountants can access
2. **Secure Storage**: Documents stored in protected directory
3. **Audit Trail**: All actions logged with user and timestamp
4. **Data Encryption**: Sensitive data encrypted at rest
5. **File Validation**: Only allowed file types (JPEG, PNG, PDF)

## Best Practices

1. **Always Screen**: Perform AML screening before approval
2. **Verify Documents**: Don't skip document verification
3. **Review High Risk**: Manually review high-risk clients
4. **Maintain Records**: Keep all documents and audit logs
5. **Regular Updates**: Re-screen clients periodically

## Integration Points

The KYC/AML module can integrate with:
- **Invoice Module**: Link clients to invoices
- **Customer Management**: Sync with customer database
- **Accounting Module**: Track compliance costs
- **Reporting Module**: Generate compliance reports

## Summary

The KYC/AML module provides a complete compliance solution for UAE businesses:
- ✅ Client onboarding with risk assessment
- ✅ Document collection and verification
- ✅ AML screening against sanctions/PEP lists
- ✅ Complete audit trail
- ✅ Compliance reporting

It helps businesses meet regulatory requirements while streamlining the onboarding process.

