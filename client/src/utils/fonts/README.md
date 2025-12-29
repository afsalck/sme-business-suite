# Arabic Font for PDF Generation

## Problem
jsPDF's default fonts (Helvetica, Times, Courier) do not support Arabic characters. When generating Arabic PDFs, the text appears as garbled characters or boxes.

## Solution
To enable proper Arabic text rendering in client-side PDFs, you need to add an Arabic font file.

## Steps to Add Arabic Font

### Option 1: Use jsPDF Font Converter (Recommended)

1. **Download an Arabic Font**
   - Recommended: **Noto Sans Arabic** (Free, Google Fonts)
   - Download from: https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
   - Get the Regular weight `.ttf` file

2. **Convert Font to jsPDF Format**
   - Use the jsPDF font converter: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
   - Upload your `.ttf` font file
   - Download the generated `.js` file
   - Rename it to: `NotoSansArabic-Regular-normal.js`

3. **Place Font File**
   - Put the `.js` file in this directory: `client/src/utils/fonts/`
   - The file should export the font data as a base64 string

4. **Update Font Loader**
   - Open `client/src/utils/pdfFonts.js`
   - Uncomment and update the import line:
   ```javascript
   const fontModule = await import('./fonts/NotoSansArabic-Regular-normal.js');
   return fontModule.default || fontModule;
   ```

### Option 2: Manual Base64 Font

1. Convert your Arabic font to base64
2. Create a file `client/src/utils/fonts/NotoSansArabic-Regular-normal.js`:
   ```javascript
   // NotoSansArabic-Regular-normal.js
   export default "BASE64_FONT_DATA_HERE";
   ```

3. The font loader will automatically detect and use it

## File Structure

```
client/
  src/
    utils/
      fonts/
        NotoSansArabic-Regular-normal.js  ← Add your font file here
        README.md (this file)
      pdfFonts.js  ← Font loader
      pdf.js  ← PDF generation
```

## Testing

After adding the font file:
1. Restart the development server
2. Set UI language to Arabic
3. Generate a PDF (invoice or receipt)
4. Arabic text should now render correctly

## Current Behavior

If no Arabic font is available:
- PDFs will still be generated with RTL layout
- Arabic labels will be used (from translations)
- But Arabic text will appear as garbled characters
- This is expected until you add the font file

## Notes

- The font file can be large (several MB)
- Consider using a font subset that only includes Arabic characters
- The font is loaded asynchronously when needed
- Once loaded, it's cached for the session

