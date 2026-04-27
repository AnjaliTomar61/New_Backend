import mongoose from "mongoose";

/** Hide password in logs (mongodb://user:pass@host or mongodb+srv://...) */
function redactMongoUri(uri) {
  if (!uri || typeof uri !== "string") return "(empty)";
  try {
    return uri.replace(/:\/\/([^/:]+):([^@]+)@/, "://$1:***@");
  } catch {
    return "(unable to redact)";
  }
}

function logConnectionDetails() {
  const c = mongoose.connection;
  const dbName = c.db?.databaseName ?? c.name ?? "(unknown)";
  const host = c.host ?? "(unknown)";
  const ready = c.readyState;
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  console.log("[DB] mongoose readyState:", ready, `(${states[ready] ?? "?"})`);
  console.log("[DB] database name:", dbName);
  console.log("[DB] host:", host);
}

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/smart_campus";
  const fromEnv = Boolean(process.env.MONGO_URI);

  console.log("[DB] MONGO_URI source:", fromEnv ? ".env MONGO_URI" : "default (localhost/smart_campus)");
  console.log("[DB] connecting to:", redactMongoUri(mongoUri));

  mongoose.connection.on("error", (err) => {
    console.error("[DB] connection error:", err?.message || err);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] disconnected");
  });

  try {
    await mongoose.connect(mongoUri);
    logConnectionDetails();
    console.log("[DB] connected successfully");
  } catch (error) {
    console.error("[DB] connection failed:", error?.message || error);
    throw error;
  }
}
