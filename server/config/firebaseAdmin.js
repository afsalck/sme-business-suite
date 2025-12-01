const admin = require("firebase-admin");

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  let credential;

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      credential = admin.credential.cert(parsed);
    } catch (error) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", error.message);
      throw error;
    }
  } else if (serviceAccountPath) {
    try {
      const path = require("path");
      const resolvedPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(__dirname, "..", serviceAccountPath);
      credential = admin.credential.cert(require(resolvedPath));
    } catch (error) {
      console.error("Failed to load Firebase service account file:", error.message);
      throw error;
    }
  } else {
    // Try to load from default location
    try {
      const path = require("path");
      const defaultPath = path.resolve(__dirname, "..", "firebase-service-account.json");
      credential = admin.credential.cert(require(defaultPath));
      console.log("Loaded Firebase service account from default location");
    } catch (error) {
      try {
        credential = admin.credential.applicationDefault();
      } catch (defaultError) {
        console.error(
          "Firebase Admin initialization failed. Provide FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH."
        );
        throw defaultError;
      }
    }
  }

  admin.initializeApp({
    credential
  });

  return admin.app();
}

module.exports = {
  initializeFirebaseAdmin,
  admin
};

