// Arabic font support for jsPDF
// This file handles loading and registering Arabic fonts for PDF generation

import jsPDF from "jspdf";

// Check if Arabic font is already registered
let arabicFontRegistered = false;
let arabicFontName = null;

/**
 * Load Arabic font from a base64 string or URL
 * For production, you should:
 * 1. Convert an Arabic font (like Noto Sans Arabic) using jsPDF font converter
 * 2. Store the base64 font data in a separate file
 * 3. Import and use it here
 */
async function loadArabicFontData() {
  // Option 1: Try to load from a local file (if you add one)
  try {
    // Try to import the font file if it exists
    const fontModule = await import('./fonts/NotoSansArabic-Regular-normal.js');
    const fontData = fontModule.default || fontModule;
    if (fontData && typeof fontData === 'string' && fontData.length > 500) {
      return fontData;
    }
    // If it's an object, try to extract the font data
    if (fontData && typeof fontData === 'object') {
      const extracted = extractFontData(JSON.stringify(fontData));
      if (extracted) return extracted;
    }
  } catch (e) {
    // Font file not found, continue to other options
    console.log('[PDF Fonts] Font file not found, trying other methods...');
  }

  // Option 2: Load from CDN (requires CORS-enabled CDN)
  // This is a placeholder - you would need to host the font file
  try {
    // const response = await fetch('https://your-cdn.com/fonts/NotoSansArabic-Regular-normal.js');
    // const fontData = await response.text();
    // return extractFontData(fontData);
    return null;
  } catch (e) {
    // CDN not available
  }

  return null;
}

/**
 * Extract font data from a jsPDF font file
 */
function extractFontData(fontFileContent) {
  if (!fontFileContent) return null;
  
  // Try to extract base64 font data from various formats
  const patterns = [
    /var\s+font\s*=\s*['"]([^'"]{500,})['"]/s,
    /const\s+font\s*=\s*['"]([^'"]{500,})['"]/s,
    /let\s+font\s*=\s*['"]([^'"]{500,})['"]/s,
    /module\.exports\s*=\s*['"]([^'"]{500,})['"]/s,
    /export\s+default\s*['"]([^'"]{500,})['"]/s,
  ];
  
  for (const pattern of patterns) {
    const match = fontFileContent.match(pattern);
    if (match && match[1] && match[1].length > 500) {
      return match[1];
    }
  }
  
  // If it's already a base64 string
  if (typeof fontFileContent === 'string' && fontFileContent.length > 500) {
    return fontFileContent;
  }
  
  return null;
}

/**
 * Register Arabic font with jsPDF
 * This function loads and registers an Arabic-supporting font
 */
export async function registerArabicFont(doc) {
  if (arabicFontRegistered && arabicFontName) {
    try {
      doc.setFont(arabicFontName, 'normal');
      return true;
    } catch (e) {
      // Font was registered but not available, try to re-register
      arabicFontRegistered = false;
    }
  }

  try {
    const fontData = await loadArabicFontData();
    
    if (!fontData) {
      console.warn('[PDF Fonts] Arabic font not available. Arabic text may not render correctly.');
      console.warn('[PDF Fonts] To fix: Add an Arabic font file (e.g., NotoSansArabic-Regular-normal.js) to client/src/utils/fonts/');
      return false;
    }

    // Try different font family names
    const fontFamilyNames = ['NotoSansArabic-Regular', 'NotoSansArabic', 'Amiri-Regular', 'Amiri'];
    const fontFileName = 'NotoSansArabic-Regular-normal.ttf';

    // Add font to VFS
    doc.addFileToVFS(fontFileName, fontData);

    // Try to add font with different family names
    for (const familyName of fontFamilyNames) {
      try {
        doc.addFont(fontFileName, familyName, 'normal');
        // Verify it works
        doc.setFont(familyName, 'normal');
        arabicFontName = familyName;
        arabicFontRegistered = true;
        console.log(`[PDF Fonts] ✅ Successfully loaded Arabic font: ${familyName}`);
        return true;
      } catch (e) {
        // Try next name
        continue;
      }
    }

    console.warn('[PDF Fonts] Failed to register Arabic font with any family name');
    return false;
  } catch (error) {
    console.error('[PDF Fonts] Error loading Arabic font:', error);
    return false;
  }
}

/**
 * Check if text contains Arabic characters
 */
export function containsArabic(text) {
  if (!text) return false;
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}

/**
 * Process Arabic text for proper rendering
 * Note: Without proper font, Arabic text will appear garbled
 * This function at least ensures the text is passed through correctly
 */
export function processArabicText(text) {
  if (!text) return text;
  
  // If text contains Arabic but font is not registered, it will be garbled
  // But we still return it so the layout is correct
  if (containsArabic(text) && !arabicFontRegistered) {
    console.warn('[PDF Fonts] Arabic text detected but font not loaded:', text.substring(0, 50));
  }
  
  return text;
}

/**
 * Get font name based on language
 */
export function getFontForLanguage(language) {
  if (language === "ar" && arabicFontRegistered && arabicFontName) {
    return arabicFontName;
  }
  return "helvetica";
}

/**
 * Set font for document based on language
 * This will attempt to register Arabic font if needed
 */
export async function setDocumentFont(doc, language) {
  if (language === "ar") {
    // Try to register Arabic font if not already registered
    if (!arabicFontRegistered) {
      await registerArabicFont(doc);
    }
    
    // Use Arabic font if available, otherwise fallback
    const fontName = getFontForLanguage(language);
    try {
      doc.setFont(fontName, 'normal');
      return true;
    } catch (error) {
      // Fallback to helvetica if Arabic font not available
      console.warn('[PDF Fonts] Arabic font not available, using helvetica (Arabic text will be garbled)');
      doc.setFont("helvetica", 'normal');
      return false;
    }
  } else {
    doc.setFont("helvetica", 'normal');
    return true;
  }
}

/**
 * Synchronous version for cases where async is not possible
 * This will use the font if already registered, otherwise fallback
 */
export function setDocumentFontSync(doc, language) {
  if (language === "ar" && arabicFontRegistered && arabicFontName) {
    try {
      doc.setFont(arabicFontName, 'normal');
      return true;
    } catch (error) {
      doc.setFont("helvetica", 'normal');
      return false;
    }
  } else {
    doc.setFont("helvetica", language === "ar" ? 'normal' : undefined);
    return language !== "ar" || arabicFontRegistered;
  }
}

/**
 * Get the current font name for the language
 * Use this instead of undefined when setting font styles
 */
export function getFontName(language) {
  if (language === "ar" && arabicFontRegistered && arabicFontName) {
    return arabicFontName;
  }
  return "helvetica";
}

/**
 * Set font with style, preserving Arabic font if registered
 */
export function setFontWithStyle(doc, language, style = 'normal') {
  const fontName = getFontName(language);
  try {
    // For Arabic fonts, only 'normal' style is usually available
    if (language === "ar" && arabicFontRegistered) {
      doc.setFont(fontName, 'normal');
    } else {
      doc.setFont(fontName, style);
    }
  } catch (error) {
    // Fallback
    doc.setFont("helvetica", style);
  }
}
