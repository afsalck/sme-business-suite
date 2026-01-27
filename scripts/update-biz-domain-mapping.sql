-- Update biz.com domain mapping to companyId = 1
-- Run this in SQL Server Management Studio (SSMS)

-- Update existing mapping
UPDATE company_email_domains 
SET companyId = 1, isActive = 1
WHERE emailDomain = 'biz.com';

-- If biz.com doesn't exist, insert it
IF NOT EXISTS (SELECT * FROM company_email_domains WHERE emailDomain = 'biz.com')
BEGIN
    INSERT INTO company_email_domains (companyId, emailDomain, isActive)
    VALUES (1, 'biz.com', 1);
END

-- Verify
SELECT emailDomain, companyId, isActive
FROM company_email_domains
WHERE emailDomain = 'biz.com';

PRINT '✅ biz.com → companyId 1 mapping updated!';

