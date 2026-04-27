import mongoose from "mongoose";
import { user } from "../models/user.model.js";
import { AdminProfile } from "../models/adminProfile.model.js";
import { FacultyProfile } from "../models/facultyProfile.model.js";
import { StudentProfile } from "../models/studentProfile.model.js";
import { Faculty } from "../models/faculty.model.js";
import { serializeUser } from "../utils/authTokens.js";

function userPublicForProfile(doc) {
  const base = serializeUser(doc);
  if (!doc) return null;
  return {
    ...base,
    gender: doc.gender ?? null,
    dob: doc.dob ? (doc.dob instanceof Date ? doc.dob.toISOString().slice(0, 10) : doc.dob) : null,
    bio: doc.bio ?? "",
    address: doc.address || {},
    skills: doc.skills ?? [],
    interests: doc.interests ?? [],
  };
}

function employmentFromFacultyDoc(hr) {
  if (!hr) return null;
  return {
    employeeId: hr.employeeId,
    departmentName: hr.departmentName || hr.department || "",
    designation: hr.designation,
    isActive: hr.isActive !== false,
  };
}

function pickAllowed(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function mergeNestedAddress(docPath, incoming) {
  if (!incoming || typeof incoming !== "object") return;
  const cur = docPath || {};
  for (const k of ["street", "city", "state", "pincode"]) {
    if (incoming[k] !== undefined) cur[k] = String(incoming[k] ?? "").trim();
  }
  return cur;
}

function normalizeSubjectsInput(body) {
  if (body.subjects === undefined) return undefined;
  if (Array.isArray(body.subjects)) {
    return body.subjects.map((s) => String(s).trim()).filter(Boolean);
  }
  return String(body.subjects)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function applyUserPatch(u, body) {
  const allowed = pickAllowed(body, ["name", "mobile", "gender", "bio", "interests", "skills"]);
  if (allowed.name !== undefined) u.name = String(allowed.name).trim();
  if (allowed.mobile !== undefined) u.mobile = String(allowed.mobile).trim();
  if (allowed.gender !== undefined) {
    const g = String(allowed.gender).toLowerCase().trim();
    u.gender = ["male", "female", "other"].includes(g) ? g : undefined;
  }
  if (allowed.bio !== undefined) u.bio = String(allowed.bio ?? "").trim() || undefined;
  if (body.dob !== undefined) {
    u.dob = body.dob && String(body.dob).trim() !== "" ? new Date(body.dob) : undefined;
  }
  if (body.interests !== undefined) {
    u.interests = Array.isArray(body.interests) ? body.interests.map(String) : [];
  }
  if (body.skills !== undefined) {
    u.skills = Array.isArray(body.skills) ? body.skills.map(String) : [];
  }
  if (body.address && typeof body.address === "object") {
    u.address = u.address || {};
    mergeNestedAddress(u.address, body.address);
  }
}

export const getMyProfile = async (req, res) => {
  try {
    const u = await user.findById(req.user.id).select("-password");
    if (!u) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let profile = null;
    if (u.role === "admin") {
      profile = await AdminProfile.findOne({ user: u._id }).lean();
    } else if (u.role === "faculty") {
      profile = await FacultyProfile.findOne({ user: u._id })
        .populate("department", "name code")
        .lean();
    } else if (u.role === "student") {
      profile = await StudentProfile.findOne({ user: u._id })
        .populate("department", "name code")
        .populate("course", "courseName courseCode")
        .populate("currentSemester", "number title")
        .populate("assignedFaculty", "name email mobile")
        .lean();
    }

    const payload = {
      success: true,
      user: userPublicForProfile(u),
      profile,
    };

    if (u.role === "faculty") {
      const hr = await Faculty.findOne({
        $or: [{ portalUser: u._id }, { officialEmail: String(u.email).toLowerCase() }],
      })
        .select("employeeId departmentName designation isActive officialEmail portalUser")
        .lean();
      payload.employment = employmentFromFacultyDoc(hr);
    }

    return res.json(payload);
  } catch (e) {
    console.error("getMyProfile", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const u = await user.findById(req.user.id).select("-password");
    if (!u) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};

    if (u.role === "admin") {
      const allowed = pickAllowed(body, [
        "jobTitle",
        "officeExtension",
        "officeLocation",
        "alternatePhone",
        "joiningDate",
        "displayTitle",
        "notes",
      ]);
      if (allowed.joiningDate !== undefined) {
        allowed.joiningDate = allowed.joiningDate ? new Date(allowed.joiningDate) : null;
      }
      const doc = await AdminProfile.findOneAndUpdate(
        { user: u._id },
        { $set: { ...allowed, user: u._id } },
        { new: true, upsert: true, runValidators: true }
      ).lean();
      return res.json({
        success: true,
        message: "Profile saved",
        user: userPublicForProfile(await user.findById(u._id).select("-password")),
        profile: doc,
      });
    }

    if (u.role === "faculty") {
      await applyUserPatch(u, body);
      await u.save();

      /** Department, designation, employee id, active flag → admin-only (see PUT /admin/faculty/:id/employment). */
      const allowed = pickAllowed(body, [
        "officeRoom",
        "specialization",
        "qualification",
        "profilePhoto",
        "experienceYears",
        "experienceSummary",
      ]);
      const subj = normalizeSubjectsInput(body);
      if (subj !== undefined) allowed.subjects = subj;
      if (
        allowed.experienceYears !== undefined &&
        allowed.experienceYears !== null &&
        allowed.experienceYears !== ""
      ) {
        const n = Number(allowed.experienceYears);
        allowed.experienceYears = Number.isFinite(n) ? n : null;
      }
      const doc = await FacultyProfile.findOneAndUpdate(
        { user: u._id },
        { $set: { ...allowed, user: u._id } },
        { new: true, upsert: true, runValidators: true }
      )
        .populate("department", "name code")
        .lean();

      const hr = await Faculty.findOne({
        $or: [{ portalUser: u._id }, { officialEmail: String(u.email).toLowerCase() }],
      })
        .select("employeeId departmentName designation isActive")
        .lean();

      return res.json({
        success: true,
        message: "Profile saved",
        user: userPublicForProfile(await user.findById(u._id).select("-password")),
        profile: doc,
        employment: employmentFromFacultyDoc(hr),
      });
    }

    if (u.role === "student") {
      await applyUserPatch(u, body);
      await u.save();

      /**
       * Academic fields (enrollment, department, course, semester, admission, assigned faculty)
       * are updated only by admin or assigned faculty — see staffRecords.controller.js.
       */
      const allowed = pickAllowed(body, [
        "guardianName",
        "guardianPhone",
        "guardianRelation",
        "bloodGroup",
        "documentsNote",
      ]);

      let doc = await StudentProfile.findOne({ user: u._id });
      if (!doc) {
        doc = new StudentProfile({ user: u._id });
      }

      Object.assign(doc, allowed);
      if (body.currentAddress) {
        doc.currentAddress = doc.currentAddress || {};
        mergeNestedAddress(doc.currentAddress, body.currentAddress);
      }
      if (body.permanentAddress) {
        doc.permanentAddress = doc.permanentAddress || {};
        mergeNestedAddress(doc.permanentAddress, body.permanentAddress);
      }

      await doc.save();
      const out = await StudentProfile.findById(doc._id)
        .populate("department", "name code")
        .populate("course", "courseName courseCode")
        .populate("currentSemester", "number title")
        .populate("assignedFaculty", "name email mobile")
        .lean();

      return res.json({
        success: true,
        message: "Profile saved",
        user: userPublicForProfile(await user.findById(u._id).select("-password")),
        profile: out,
      });
    }

    return res.status(400).json({ success: false, message: "Unknown role" });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate value (e.g. enrollment or employee id)" });
    }
    console.error("updateMyProfile", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
