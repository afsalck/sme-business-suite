const https = require("https");
const fs = require("fs");
const path = require("path");

const fontsDir = path.join(__dirname, "../server/fonts");

// Ensure fonts directory exists
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
  console.log("✅ Created fonts directory");
}

// Function to download a file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            console.log(`✅ Downloaded: ${path.basename(dest)}`);
            resolve();
          });
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          file.close();
          fs.unlinkSync(dest);
          downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        } else {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`Failed to download: ${response.statusCode}`));
        }
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

// Function to convert TTF to jsPDF format using online converter
async function setupArabicFont() {
  console.log("🔄 Setting up Arabic font for PDF generation...\n");

  const fontUrl =
    "https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf";
  const ttfPath = path.join(fontsDir, "NotoSansArabic-Regular.ttf");

  try {
    // Download the font file
    console.log("📥 Downloading Noto Sans Arabic font...");
    await downloadFile(fontUrl, ttfPath);
    console.log("✅ Font file downloaded successfully\n");

    console.log("⚠️  IMPORTANT: Font conversion required");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("The font file has been downloaded, but it needs to be converted to jsPDF format.");
    console.log("\n📋 Next steps:");
    console.log("1. Go to: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html");
    console.log(`2. Upload the file: ${ttfPath}`);
    console.log("3. Click 'Convert' and download the generated .js file");
    console.log(`4. Rename it to: NotoSansArabic-Regular-normal.js`);
    console.log(`5. Place it in: ${fontsDir}`);
    console.log("6. Restart your server");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("💡 Alternative: Use a pre-converted font");
    console.log("You can also search for 'NotoSansArabic jsPDF font' online to find");
    console.log("a pre-converted font file that you can directly use.\n");
  } catch (error) {
    console.error("❌ Error setting up Arabic font:", error.message);
    console.log("\n📋 Manual setup instructions:");
    console.log("1. Download Noto Sans Arabic from: https://fonts.google.com/noto/specimen/Noto+Sans+Arabic");
    console.log("2. Convert it using: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html");
    console.log(`3. Place the converted .js file in: ${fontsDir}`);
    console.log("4. Name it: NotoSansArabic-Regular-normal.js");
    console.log("5. Restart your server\n");
  }
}

// Run the setup
setupArabicFont();

