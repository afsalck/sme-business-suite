const fs = require("fs");
const path = require("path");
const os = require("os");

// Get Downloads folder path
const downloadsPath = path.join(os.homedir(), "Downloads");
const fontsDir = path.join(__dirname, "../server/fonts");
const targetFileName = "NotoSansArabic-Regular-normal.js";

console.log("🔍 Looking for Arabic font file in Downloads...\n");

// Ensure fonts directory exists
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
  console.log("✅ Created fonts directory:", fontsDir);
}

// Look for the font file in Downloads
const downloadsFiles = fs.readdirSync(downloadsPath);
const fontFiles = downloadsFiles.filter(file => 
  file.includes("NotoSansArabic") && file.endsWith(".js")
);

if (fontFiles.length === 0) {
  console.log("❌ No Arabic font JS file found in Downloads folder.");
  console.log("\n📋 Next steps:");
  console.log("1. Convert the TTF file using: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html");
  console.log("2. Download the converted .js file");
  console.log("3. Run this script again, or manually:");
  console.log(`   - Copy the .js file to: ${fontsDir}`);
  console.log(`   - Rename it to: ${targetFileName}`);
  process.exit(1);
}

// Find the most recent font file
let fontFile = fontFiles[0];
if (fontFiles.length > 1) {
  // Get the most recently modified file
  fontFiles.sort((a, b) => {
    const statA = fs.statSync(path.join(downloadsPath, a));
    const statB = fs.statSync(path.join(downloadsPath, b));
    return statB.mtime - statA.mtime;
  });
  fontFile = fontFiles[0];
  console.log(`📦 Found ${fontFiles.length} font file(s), using most recent: ${fontFile}`);
} else {
  console.log(`📦 Found font file: ${fontFile}`);
}

const sourcePath = path.join(downloadsPath, fontFile);
const targetPath = path.join(fontsDir, targetFileName);

try {
  // Copy the file
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`\n✅ Successfully copied font file!`);
  console.log(`   From: ${sourcePath}`);
  console.log(`   To:   ${targetPath}`);
  console.log(`\n🎉 Arabic font is now ready!`);
  console.log(`\n📋 Next step: Restart your server to load the font.`);
} catch (error) {
  console.error("❌ Error copying font file:", error.message);
  console.log(`\n📋 Manual steps:`);
  console.log(`1. Copy: ${sourcePath}`);
  console.log(`2. Paste to: ${fontsDir}`);
  console.log(`3. Rename to: ${targetFileName}`);
  process.exit(1);
}

