const mongoose = require("mongoose");

/**
 * Opens the MongoDB connection used by the whole API.
 * Works with a local MongoDB server or a MongoDB Atlas connection string.
 */
async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) {
    throw new Error("MONGO_URI is missing. Copy server/.env.example to server/.env and set it.");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
