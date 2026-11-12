const mongoose = require("mongoose");

let memoryServer;

/**
 * Connects to a throwaway test database.
 * - If MONGO_URI_TEST is set, a fresh database is created on that server.
 * - Otherwise an in-memory MongoDB is started (downloaded once on first run).
 */
async function connect() {
  process.env.NODE_ENV = "test";
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require("mongodb-memory-server-core");
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  await mongoose.connect(uri, { dbName: `test_${process.pid}_${Date.now()}` });
}

async function clear() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function close() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connect, clear, close };
