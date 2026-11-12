require("dotenv").config({ quiet: true });

const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Campus Registry API running on http://localhost:${PORT}`));
  } catch (error) {
    console.error("Could not start the server:", error.message);
    process.exit(1);
  }
}

start();
