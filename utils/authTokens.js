import jwt from "jsonwebtoken";

export function serializeUser(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    mobile: doc.mobile ?? "",
  };
}

export function jwtForUser(doc) {
  const secret = process.env.JWT_ACCESS_SECRET || "dev_secret";
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "1d";
  return jwt.sign({ sub: doc._id.toString(), role: doc.role }, secret, { expiresIn });
}
