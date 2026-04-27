import jwt from "jsonwebtoken";
import { user as User } from "../models/user.model.js";

function extractBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== "string") return null;
  const m = headerValue.match(/^Bearer\s+(\S+)/i);
  return m ? m[1] : null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const secret = process.env.JWT_ACCESS_SECRET || "dev_secret";
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      const msg =
        e?.name === "TokenExpiredError" ? "Session expired. Please sign in again." : "Invalid token";
      return res.status(401).json({ success: false, message: msg });
    }

    const dbUser = await User.findById(payload.sub).select("-password");
    if (!dbUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Always trust DB role (not JWT payload) for authorization
    req.user = {
      id: dbUser._id.toString(),
      role: dbUser.role,
      email: dbUser.email,
      name: dbUser.name,
    };

    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
  };
}

/** Only the same user, or an admin, may access the target user id */
export function requireSelfOrAdmin(paramName = "userId") {
  return (req, res, next) => {
    const target = req.params[paramName];
    if (!target) {
      return res.status(400).json({ success: false, message: "Missing user id" });
    }
    if (req.user.role === "admin" || req.user.id === String(target)) {
      return next();
    }
    return res.status(403).json({ success: false, message: "Forbidden" });
  };
}
