# Quick Setup: Arabic Font for PDF Invoices

## Problem
When downloading Arabic invoices, the text appears corrupted because jsPDF doesn't have an Arabic font by default.

## 📥 Quick Download Links

**Need the TTF font file?**
- **Direct Download:** https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf
- **Google Fonts Page:** https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
- **GitHub Repository:** https://github.com/google/fonts/tree/main/ofl/notosansarabic

**Need the converted JS file? (Ready to use)**
- Search GitHub for: "jsPDF Arabic font" or "NotoSansArabic jsPDF"
- Or convert the TTF file using the converter below

## Quick Solution (5 minutes)

### Option 1: Use Pre-Converted Font (Easiest)

1. **Download a pre-converted Arabic font:**
   - Go to: https://github.com/sphilee/jsPDF-CustomFonts-support-Arabic
   - Or search for "jsPDF Arabic font" on GitHub
   - Download a `NotoSansArabic-Regular-normal.js` file

2. **Place the file:**
   - Create folder: `server/fonts/` (if it doesn't exist)
   - Place the downloaded `.js` file in `server/fonts/`
   - Name it: `NotoSansArabic-Regular-normal.js`

3. **Restart your server**

### Option 2: Convert Your Own Font

1. **Download Noto Sans Arabic TTF file:**

   **Method A - Direct Download (Easiest):**
   - Direct link: https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf
   - Right-click the link and "Save As" → Save as `NotoSansArabic-Regular.ttf`
   
   **Method B - Google Fonts:**
   - Go to: https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
   - Click "Download family" button (top right)
   - Extract the downloaded ZIP file
   - Navigate to the extracted folder
   - Find `NotoSansArabic-Regular.ttf` in the folder
   
   **Method C - GitHub Repository:**
   - Go to: https://github.com/google/fonts/tree/main/ofl/notosansarabic
   - Click on the `.ttf` file
   - Click "Download" or "Raw" button

2. **Convert the font:**
   - Go to: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
   - Click "Choose File" and select `NotoSansArabic-Regular.ttf`
   - Click "Convert"
   - Download the generated `.js` file

3. **Place the file:**
   - Create folder: `server/fonts/` (if it doesn't exist)
   - Place the converted `.js` file in `server/fonts/`
   - Name it: `NotoSansArabic-Regular-normal.js`

4. **Restart your server**

### Option 3: Use the Setup Script

Run this command:
```bash
npm run setup-arabic-font
```

This will download the font file and provide instructions for conversion.

## Verify It's Working

1. Restart your server
2. Create or view an Arabic invoice
3. Download the PDF
4. Check if Arabic text displays correctly

## Troubleshooting

- **Still seeing corrupted text?**
  - Make sure the font file is named exactly: `NotoSansArabic-Regular-normal.js`
  - Make sure it's in `server/fonts/` directory
  - Check server console for font loading messages
  - Restart the server after adding the font

- **Font file not loading?**
  - Check the file format - it should be a JavaScript file with base64 font data
  - Make sure the file exports the font data correctly
  - Check server console for error messages

- **Need help?**
  - Check `server/fonts/README.md` for detailed instructions
  - The font file should export font data like: `module.exports = "BASE64_DATA"`

## Current Behavior

- **Without Arabic font:** PDFs use English labels (prevents corruption)
- **With Arabic font:** PDFs display proper Arabic text with RTL layout

## File Structure

After setup, your structure should look like:
```
server/
  fonts/
    NotoSansArabic-Regular-normal.js  ← Arabic font file
    README.md
```

## Quick Links

- **Font Converter:** https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
- **Noto Sans Arabic:** https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
- **Pre-converted fonts:** Search GitHub for "jsPDF Arabic font"

