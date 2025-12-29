/**
 * Developer Check Utility
 * Determines if a user is a developer (has access to developer-only modules)
 * 
 * Customize this function based on how you identify developers
 */

/**
 * Check if user is a developer
 * Developers must have admin role AND match developer email criteria
 * @param {Object} user - User object from auth context
 * @returns {boolean} - True if user is a developer
 */
export function isDeveloper(user) {
  if (!user || !user.email) return false;
  
  // Developers must have admin role
  if (user.role !== 'admin') {
    return false;
  }
  
  // Option 1: Check by email domain
  const developerDomains = [
    '@bizease.ae',
    '@developer.com'
  ];
  
  if (developerDomains.some(domain => user.email.endsWith(domain))) {
    return true;
  }
  
  // Option 2: Check by specific email addresses
  const developerEmails = [
    'developer@bizease.ae',
    'admin@bizease.ae' // Add your developer emails here
  ];
  
  if (developerEmails.includes(user.email.toLowerCase())) {
    return true;
  }
  
  // Option 3: Check by environment variable (for multiple developers)
  if (process.env.REACT_APP_DEVELOPER_EMAILS) {
    const allowedEmails = process.env.REACT_APP_DEVELOPER_EMAILS
      .split(',')
      .map(email => email.trim().toLowerCase());
    
    if (allowedEmails.includes(user.email.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

