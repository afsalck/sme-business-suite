# Arabic Font Support for PDF Generation

## Problem
jsPDF's default fonts (Helvetica, Times, Courier) do not support Arabic characters. When generating Arabic invoices, the text appears corrupted because the font cannot render Arabic glyphs.

## Solution
To enable proper Arabic text rendering in PDFs, you need to add an Arabic font file to jsPDF.

## Steps to Add Arabic Font Support

### 1. Download an Arabic Font
Download a font that supports Arabic characters. Recommended fonts:
- **Noto Sans Arabic** (Free, Google Fonts): https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
- **Arial Unicode MS** (If available on your system)
- Any other Arabic-supporting TrueType font (.ttf)

### 2. Convert Font to jsPDF Format
jsPDF requires fonts in a specific JavaScript format. Use the jsPDF font converter:

1. Install the font converter tool:
   ```bash
   npm install -g jspdf-font-converter
   ```

2. Convert your font file:
   ```bash
   jspdf-font-converter path/to/NotoSansArabic-Regular.ttf
   ```

   This will generate a `.js` file (e.g., `NotoSansArabic-Regular-normal.js`)

### 3. Place Font File
Place the generated `.js` file in this directory (`server/fonts/`).

Example structure:
```
server/
  fonts/
    NotoSansArabic-Regular-normal.js
    README.md (this file)
```

### 4. Update Font Loading (if needed)
The `pdfService.js` file already has code to automatically load fonts from this directory. The font file should export the font data in the format expected by jsPDF.

### 5. Test
After adding the font file, restart the server and generate an Arabic invoice. The Arabic text should now render correctly.

## Alternative: Using Online Font Converter

If you prefer not to install the converter tool, you can use an online converter:
1. Go to: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
2. Upload your `.ttf` font file
3. Download the generated `.js` file
4. Place it in `server/fonts/` directory

## Font File Format

The font file should export font data like this:
```javascript
// NotoSansArabic-Regular-normal.js
module.exports = "BASE64_ENCODED_FONT_DATA";
```

Or if using the jsPDF font converter, it will generate the correct format automatically.

## Troubleshooting

- **Font not loading**: Check that the font file is in the correct location (`server/fonts/`)
- **Still seeing corrupted text**: Ensure the font file format is correct and the font actually supports Arabic characters
- **Font file too large**: Consider using a subset font that only includes Arabic characters to reduce file size

## Current Behavior

If no Arabic font is available, the system will:
- Use English labels instead of Arabic (to prevent text corruption)
- Log a warning message in the console
- Still maintain proper RTL layout for Arabic invoices

This ensures PDFs are always readable, even if Arabic font support is not yet configured.

