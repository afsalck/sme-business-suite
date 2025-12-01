// Background user synchronization utility
// Creates users asynchronously without blocking requests
const mongoose = require("mongoose");
const User = require("../../models/User");

const pendingUsers = new Map(); // Track users being created
const MAX_RETRIES = 3;

async function createUserInBackground(userData, retryCount = 0) {
  // Safety check - don't proceed if no userData
  if (!userData || !userData.uid) {
    console.error('[UserSync] Invalid userData provided');
    return;
  }
  
  const key = userData.uid;
  
  // Prevent duplicate creation attempts
  if (pendingUsers.has(key)) {
    return;
  }
  
  // Check if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    console.log(`[UserSync] MongoDB not connected (ReadyState: ${mongoose.connection.readyState}), will retry later`);
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        createUserInBackground(userData, retryCount + 1);
      }, 5000);
    }
    return;
  }
  
  pendingUsers.set(key, true);
  
  try {
    // Check if user already exists (quick check)
    try {
      const existing = await User.findOne({ uid: userData.uid }).maxTimeMS(2000).lean();
      if (existing) {
        console.log(`[UserSync] User already exists: ${userData.email}`);
        pendingUsers.delete(key);
        return existing;
      }
    } catch (checkError) {
      // Ignore check errors, proceed with creation
    }
    
    // Try to create user with direct MongoDB insert (faster)
    const mongoData = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Use a promise with timeout for the insert
    const insertPromise = User.collection.insertOne(mongoData);
    const insertTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Insert timeout")), 8000)
    );
    
    const insertResult = await Promise.race([insertPromise, insertTimeout]);
    console.log(`[UserSync] ✅ User created: ${userData.email} (ID: ${insertResult.insertedId})`);
    pendingUsers.delete(key);
    return insertResult;
  } catch (error) {
    pendingUsers.delete(key);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`[UserSync] Retry ${retryCount + 1}/${MAX_RETRIES} for ${userData.email} - ${error.message}`);
      // Retry after a delay
      setTimeout(() => {
        createUserInBackground(userData, retryCount + 1);
      }, 2000 * (retryCount + 1)); // Exponential backoff
    } else {
      console.error(`[UserSync] ❌ Failed to create user after ${MAX_RETRIES} retries: ${userData.email}`);
      console.error(`[UserSync] Error: ${error.message}`);
    }
  }
}

module.exports = {
  createUserInBackground
};

