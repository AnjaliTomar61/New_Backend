import { user } from "../models/user.model.js";
import { Faculty } from "../models/faculty.model.js";
import { FacultyProfile } from "../models/facultyProfile.model.js";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * When no `user` row exists yet, link a legacy `Faculty` record to the portal by
 * creating a `user` with role faculty (same password as Faculty record).
 * @returns {import("mongoose").Document|null} new or existing portal user, or null
 */
export async function migrateLegacyFacultyToPortalUser(emailNorm, password) {
  const fac = await Faculty.findOne({
    officialEmail: { $regex: new RegExp(`^${escapeRegex(emailNorm)}$`, "i") },
  });
  if (!fac || String(password) !== String(fac.password)) {
    return null;
  }
  try {
    const legacyName =
      typeof fac.name === "string" && fac.name.trim() ? fac.name.trim() : emailNorm.split("@")[0];
    const created = await user.create({
      name: legacyName,
      email: emailNorm,
      mobile: "",
      password: String(fac.password),
      role: "faculty",
    });

    await Faculty.findByIdAndUpdate(fac._id, { $set: { portalUser: created._id } });

    await FacultyProfile.findOneAndUpdate(
      { user: created._id },
      {
        $set: {
          user: created._id,
          designation: fac.designation || "Lecturer",
          isActive: fac.isActive !== false,
          ...(fac.employeeId ? { employeeId: String(fac.employeeId).trim() } : {}),
        },
      },
      { upsert: true, runValidators: true }
    );

    return created;
  } catch (e) {
    if (e?.code === 11000) {
      const u = await user.findOne({ email: emailNorm }).select("+password");
      if (u && u.role === "faculty" && String(u.password) === String(password)) {
        return u;
      }
      return null;
    }
    throw e;
  }
}
