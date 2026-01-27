# KYC/AML Module Setup Guide

## Overview

The KYC/AML (Know Your Customer / Anti-Money Laundering) module provides comprehensive client onboarding, document management, identity verification, and AML screening capabilities for UAE compliance requirements.

## Features

1. **Client Onboarding** - Create and manage client profiles (individuals and companies)
2. **Document Management** - Upload, verify, and track KYC documents
3. **AML Screening** - Perform sanctions and PEP (Politically Exposed Person) checks
4. **Risk Assessment** - Automatic risk scoring and categorization
5. **KYC Status Management** - Track client verification status (pending, in_review, approved, rejected)
6. **Audit Trail** - Complete audit log of all KYC/AML activities

## Setup Instructions

### 1. Run Database Migration

Execute the SQL script to create the KYC/AML tables:

```sql
-- Run this in SQL Server Management Studio or your SQL client
-- File: server/create-kyc-aml-module.sql
```

Or run it via command line:
```bash
sqlcmd -S your_server -d Biz -i server/create-kyc-aml-module.sql
```

### 2. Install Dependencies

Multer is already included in package.json. If you need to reinstall:

```bash
cd server
npm install multer
```

### 3. Create Uploads Directory

The system will automatically create the `uploads/kyc-documents` directory when needed, but you can create it manually:

```bash
mkdir -p uploads/kyc-documents
```

### 4. Access KYC/AML Module

- Navigate to **Compliance > KYC/AML Clients** in the sidebar
- Only admins and accountants can access this module

## How to Use

### Creating a Client

1. Click **"+ New Client"** button
2. Select client type (Individual or Company)
3. Fill in required information:
   - **Individual**: Full name, email, phone, Emirates ID or Passport
   - **Company**: Company name, trade license number, contact details
4. Click **"Create Client"**
5. The system will:
   - Calculate initial risk score
   - Set KYC status to "pending"
   - Set AML status to "pending"

### Uploading Documents

1. Click **"View"** on a client
2. In the client detail modal, you can upload documents
3. Supported document types:
   - Passport
   - Emirates ID
   - Trade License
   - Proof of Address
   - Bank Statement
   - Other
4. Supported file formats: JPEG, PNG, PDF (max 10MB)

### Verifying Documents

1. View client documents
2. Click **"Verify"** on a document
3. Add verification notes (optional)
4. Document status changes to "verified"

### Performing AML Screening

1. Click **"Screen"** button on a client
2. The system will:
   - Check against sanctions lists
   - Check against PEP database
   - Generate match score
   - Update AML status (cleared, flagged, or blocked)

### Managing KYC Status

1. **Pending** → **In Review**: Click "Review" button
2. **In Review** → **Approved/Rejected**: Click "Approve" or "Reject"
3. Status changes are logged in audit trail

## Risk Scoring

The system automatically calculates risk scores based on:

- **High-risk countries** (+20 points)
- **Missing identification** (+15 points)
- **Company without trade license** (+10 points)
- **Missing address** (+5 points)
- **PEP status** (+30 points)

Risk Categories:
- **Low**: 0-39 points
- **Medium**: 40-69 points
- **High**: 70-100 points

## AML Screening

### Current Implementation

The module includes basic AML screening with:
- Sanctions list checking
- PEP (Politically Exposed Person) checking
- Match scoring (0-100)
- Decision making (cleared, flagged, blocked)

### Future Enhancements

For production use, integrate with:
- **Third-party AML services** (e.g., Dow Jones, World-Check, Refinitiv)
- **UAE Central Bank sanctions lists**
- **UN Sanctions lists**
- **Enhanced PEP databases**

## Document Storage

- Documents are stored in `uploads/kyc-documents/`
- Files are named: `client-{clientId}-{timestamp}.{ext}`
- Original filenames are preserved in database
- Documents can be downloaded via API

## API Endpoints

### Clients
- `GET /api/kyc` - List all clients (with filters)
- `POST /api/kyc` - Create new client
- `GET /api/kyc/:id` - Get client details
- `PUT /api/kyc/:id/kyc-status` - Update KYC status

### Documents
- `POST /api/kyc/:id/documents` - Upload document
- `PUT /api/kyc/documents/:id/verify` - Verify document
- `GET /api/kyc/documents/:id/download` - Download document

### AML Screening
- `POST /api/kyc/:id/aml-screening` - Perform AML screening
- `GET /api/kyc/:id/aml-screenings` - Get client screenings
- `PUT /api/kyc/aml-screenings/:id/decision` - Update screening decision

## Compliance Features

### Audit Trail

All actions are logged in `kyc_audit_log` table:
- Client creation/updates
- Document uploads/verifications
- KYC status changes
- AML screenings
- Decision updates

### Data Retention

- All client data is retained for compliance
- Documents are stored securely
- Audit logs are permanent

## Important Notes

1. **File Size Limit**: 10MB per document
2. **Supported Formats**: JPEG, PNG, PDF only
3. **Access Control**: Only admins and accountants can access
4. **Risk Scoring**: Automatic on client creation
5. **AML Screening**: Basic implementation - enhance with third-party services for production

## Next Steps

1. **Run the database migration**
2. **Test client creation**
3. **Upload sample documents**
4. **Perform AML screening**
5. **Review audit logs**

## Production Considerations

For production deployment:

1. **Integrate real AML services**:
   - Dow Jones Risk & Compliance
   - World-Check (Refinitiv)
   - Local UAE sanctions lists

2. **Enhanced document verification**:
   - OCR for document reading
   - Automated verification APIs
   - UAE Pass integration

3. **Compliance reporting**:
   - Generate compliance reports
   - Export audit logs
   - Regulatory submissions

4. **Security**:
   - Encrypt document storage
   - Secure file uploads
   - Access logging

5. **Performance**:
   - Index optimization
   - File storage optimization
   - Caching for frequent queries

