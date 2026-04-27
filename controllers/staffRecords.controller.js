import mongoose from "mongoose";
import { user } from "../models/user.model.js";
import { StudentProfile } from "../models/studentProfile.model.js";
import { FacultyProfile } from "../models/facultyProfile.model.js";
import { Faculty } from "../models/faculty.model.js";
import { Department } from "../models/department.model.js";
import { serializeUser } from "../utils/authTokens.js";
import { nextEnrollmentNo } from "../utils/idGenerator.js";

const ADMISSION = ["pending", "approved", "rejected"];

/** Rich user payload for admin faculty directory (no password). */
function facultyUserPublicForAdmin(doc) {
  if (!doc) return null;
  const u = doc;
  const base = serializeUser(u);
  return {
    ...base,
    gender: u.gender ?? null,
    dob: u.dob instanceof Date ? u.dob.toISOString().slice(0, 10) : u.dob || null,
    bio: u.bio ?? "",
    address: u.address || {},
    skills: u.skills ?? [],
    interests: u.interests ?? [],
  };
}

/** Student account fields visible to assigned faculty (no password). */
function studentUserPublicForMentor(doc) {
  if (!doc) return null;
  const u = doc;
  const base = serializeUser(u);
  return {
    ...base,
    gender: u.gender ?? null,
    dob: u.dob instanceof Date ? u.dob.toISOString().slice(0, 10) : u.dob || null,
    bio: u.bio ?? "",
    address: u.address || {},
    skills: u.skills ?? [],
    interests: u.interests ?? [],
  };
}

function mergeAddressFields(target, incoming) {
  if (!target || !incoming || typeof incoming !== "object") return;
  for (const k of ["street", "city", "state", "pincode"]) {
    if (incoming[k] !== undefined) target[k] = String(incoming[k] ?? "").trim();
  }
}

/** Guardian / address fields mentors may help maintain (StudentProfile only). */
function applyMentorProfileBody(doc, body) {
  if (!body || typeof body !== "object") return;
  for (const key of ["guardianName", "guardianPhone", "guardianRelation", "bloodGroup"]) {
    if (body[key] !== undefined) doc[key] = String(body[key] ?? "").trim();
  }
  if (body.documentsNote !== undefined) {
    doc.documentsNote = String(body.documentsNote ?? "");
  }
  if (body.currentAddress !== undefined) {
    doc.currentAddress = doc.currentAddress || {};
    mergeAddressFields(doc.currentAddress, body.currentAddress);
  }
  if (body.permanentAddress !== undefined) {
    doc.permanentAddress = doc.permanentAddress || {};
    mergeAddressFields(doc.permanentAddress, body.permanentAddress);
  }
}

function studentProfilePopulate(q) {
  return q
    .populate("user", "name email role mobile gender")
    .populate("department", "name code")
    .populate("course", "courseName courseCode")
    .populate("currentSemester", "number title")
    .populate("assignedFaculty", "name email mobile");
}

async function ensureStudentProfile(userId) {
  let doc = await StudentProfile.findOne({ user: userId });
  if (!doc) {
    const enrollmentNo = await nextEnrollmentNo();
    doc = await StudentProfile.create({ user: userId, admissionStatus: "pending", enrollmentNo });
  } else if (!doc.enrollmentNo || !String(doc.enrollmentNo).trim()) {
    doc.enrollmentNo = await nextEnrollmentNo();
    await doc.save();
  }
  return doc;
}

async function leanProfileByUserId(userId) {
  const doc = await studentProfilePopulate(StudentProfile.findOne({ user: userId })).lean();
  return doc;
}

/** Admin: all student profiles for academic / assignment management */
export const getAdminStudentAcademics = async (req, res) => {
  try {
    const profiles = await studentProfilePopulate(StudentProfile.find({}).sort({ updatedAt: -1 }).limit(500)).lean();

    const rows = profiles
      .filter((p) => p.user && p.user.role === "student")
      .map((p) => ({
        userId: p.user._id.toString(),
        name: p.user.name,
        email: p.user.email,
        profile: p,
      }));

    return res.json({ success: true, students: rows });
  } catch (e) {
    console.error("getAdminStudentAcademics", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** Faculty: students assigned to this faculty member */
export const getFacultyAssignedStudents = async (req, res) => {
  try {
    const profiles = await studentProfilePopulate(
      StudentProfile.find({ assignedFaculty: req.user.id }).sort({ updatedAt: -1 })
    ).lean();

    const rows = profiles
      .filter((p) => p.user && p.user.role === "student")
      .map((p) => ({
        userId: p.user._id.toString(),
        name: p.user.name,
        email: p.user.email,
        profile: p,
      }));

    return res.json({ success: true, students: rows });
  } catch (e) {
    console.error("getFacultyAssignedStudents", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** Faculty: full read-only snapshot for one assigned student (contact + academic + guardian). */
export const getFacultyAssignedStudentDetail = async (req, res) => {
  try {
    const { studentUserId } = req.params;
    if (!mongoose.isValidObjectId(studentUserId)) {
      return res.status(400).json({ success: false, message: "Invalid student id" });
    }

    const studentUser = await user.findById(studentUserId).select("-password");
    if (!studentUser || studentUser.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const doc = await StudentProfile.findOne({ user: studentUserId });
    if (!doc || !doc.assignedFaculty || String(doc.assignedFaculty) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You are not the assigned faculty for this student.",
      });
    }

    const profile = await studentProfilePopulate(StudentProfile.findOne({ user: studentUserId })).lean();

    return res.json({
      success: true,
      user: studentUserPublicForMentor(studentUser),
      profile,
    });
  } catch (e) {
    console.error("getFacultyAssignedStudentDetail", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

function applyAcademicBody(doc, body) {
  if (body.enrollmentNo !== undefined) {
    const t = String(body.enrollmentNo ?? "").trim();
    doc.enrollmentNo = t.length ? t : undefined;
  }
  for (const ref of ["department", "course", "currentSemester"]) {
    if (body[ref] === undefined) continue;
    const v = body[ref];
    if (v === null || v === "") {
      doc[ref] = null;
    } else if (mongoose.isValidObjectId(v)) {
      doc[ref] = v;
    }
  }
  if (body.admissionStatus !== undefined && ADMISSION.includes(String(body.admissionStatus))) {
    doc.admissionStatus = body.admissionStatus;
  }
}

/** Admin: update student academic record + optional assigned faculty */
export const putAdminStudentAcademic = async (req, res) => {
  try {
    const { studentUserId } = req.params;
    if (!mongoose.isValidObjectId(studentUserId)) {
      return res.status(400).json({ success: false, message: "Invalid student id" });
    }

    const studentUser = await user.findById(studentUserId);
    if (!studentUser || studentUser.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const doc = await ensureStudentProfile(studentUserId);
    applyAcademicBody(doc, body);

    if (body.assignedFaculty !== undefined) {
      const v = body.assignedFaculty;
      if (v === null || v === "") {
        doc.assignedFaculty = null;
      } else if (mongoose.isValidObjectId(v)) {
        const fac = await user.findById(v).select("role");
        if (fac && fac.role === "faculty") {
          doc.assignedFaculty = v;
        } else {
          return res.status(400).json({ success: false, message: "assignedFaculty must be a faculty user id" });
        }
      }
    }

    await doc.save();
    const out = await leanProfileByUserId(studentUserId);
    return res.json({
      success: true,
      message: "Student academic record updated",
      profile: out,
      user: serializeUser(studentUser),
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate enrollment number" });
    }
    console.error("putAdminStudentAcademic", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** Faculty: update academic fields only for assigned students */
export const putFacultyStudentAcademic = async (req, res) => {
  try {
    const { studentUserId } = req.params;
    if (!mongoose.isValidObjectId(studentUserId)) {
      return res.status(400).json({ success: false, message: "Invalid student id" });
    }

    const studentUser = await user.findById(studentUserId);
    if (!studentUser || studentUser.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const doc = await ensureStudentProfile(studentUserId);
    if (!doc.assignedFaculty || String(doc.assignedFaculty) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You are not the assigned faculty for this student. Ask an administrator to assign you.",
      });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (body.assignedFaculty !== undefined) {
      return res.status(403).json({ success: false, message: "Only an administrator can change assigned faculty" });
    }

    applyAcademicBody(doc, body);
    applyMentorProfileBody(doc, body);
    await doc.save();

    const out = await leanProfileByUserId(studentUserId);
    const uOut = await user.findById(studentUserId).select("-password");
    return res.json({
      success: true,
      message: "Student record updated",
      profile: out,
      user: studentUserPublicForMentor(uOut),
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate enrollment number" });
    }
    console.error("putFacultyStudentAcademic", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** Admin: update faculty catalog department + designation (+ HR row when present) */
export const putAdminFacultyEmployment = async (req, res) => {
  try {
    const { facultyUserId } = req.params;
    if (!mongoose.isValidObjectId(facultyUserId)) {
      return res.status(400).json({ success: false, message: "Invalid faculty id" });
    }

    const facUser = await user.findById(facultyUserId);
    if (!facUser || facUser.role !== "faculty") {
      return res.status(404).json({ success: false, message: "Faculty user not found" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const set = {};

    if (body.department !== undefined) {
      const v = body.department;
      if (v === null || v === "") set.department = null;
      else if (mongoose.isValidObjectId(v)) set.department = v;
      else return res.status(400).json({ success: false, message: "Invalid department id" });
    }
    if (body.designation !== undefined) {
      set.designation = String(body.designation || "").trim() || "Lecturer";
    }
    if (body.employeeId !== undefined) {
      const t = String(body.employeeId ?? "").trim();
      set.employeeId = t.length ? t : undefined;
    }
    if (body.isActive !== undefined) {
      set.isActive = Boolean(body.isActive);
    }

    const doc = await FacultyProfile.findOneAndUpdate(
      { user: facUser._id },
      { $set: { ...set, user: facUser._id } },
      { new: true, upsert: true, runValidators: true }
    )
      .populate("department", "name code")
      .lean();

    let deptName = "";
    if (doc?.department && typeof doc.department === "object" && doc.department.name) {
      deptName = doc.department.name;
    } else if (doc?.department && mongoose.isValidObjectId(doc.department)) {
      const d = await Department.findById(doc.department).select("name").lean();
      deptName = d?.name || "";
    }

    const hr = await Faculty.findOne({
      $or: [{ portalUser: facUser._id }, { officialEmail: String(facUser.email).toLowerCase() }],
    });
    if (hr) {
      if (set.designation !== undefined) hr.designation = set.designation;
      if (deptName) hr.departmentName = deptName;
      if (set.employeeId !== undefined && set.employeeId) hr.employeeId = set.employeeId;
      if (set.isActive !== undefined) hr.isActive = set.isActive;
      if (!hr.portalUser) hr.portalUser = facUser._id;
      await hr.save();
    }

    const hrOut = await Faculty.findOne({
      $or: [{ portalUser: facUser._id }, { officialEmail: String(facUser.email).toLowerCase() }],
    })
      .select("employeeId departmentName designation isActive portalUser officialEmail")
      .lean();

    return res.json({
      success: true,
      message: "Faculty placement updated",
      profile: doc,
      employment: hrOut
        ? {
            employeeId: hrOut.employeeId,
            departmentName: hrOut.departmentName || "",
            designation: hrOut.designation,
            isActive: hrOut.isActive !== false,
          }
        : null,
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate employee id" });
    }
    console.error("putAdminFacultyEmployment", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** Admin: read faculty placement (profile + HR) before editing */
export const getAdminFacultyPlacement = async (req, res) => {
  try {
    const { facultyUserId } = req.params;
    if (!mongoose.isValidObjectId(facultyUserId)) {
      return res.status(400).json({ success: false, message: "Invalid faculty id" });
    }

    const facUser = await user.findById(facultyUserId).select("-password");
    if (!facUser || facUser.role !== "faculty") {
      return res.status(404).json({ success: false, message: "Faculty user not found" });
    }

    const profile = await FacultyProfile.findOne({ user: facUser._id })
      .populate("department", "name code")
      .lean();

    const hr = await Faculty.findOne({
      $or: [{ portalUser: facUser._id }, { officialEmail: String(facUser.email).toLowerCase() }],
    })
      .select("employeeId departmentName designation isActive portalUser officialEmail")
      .lean();

    return res.json({
      success: true,
      user: serializeUser(facUser),
      profile,
      employment: hr
        ? {
            employeeId: hr.employeeId,
            departmentName: hr.departmentName || hr.department || "",
            designation: hr.designation,
            isActive: hr.isActive !== false,
          }
        : null,
    });
  } catch (e) {
    console.error("getAdminFacultyPlacement", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** Admin: full faculty snapshot for directory — portal user, profiles, HR row, assigned students */
export const getAdminFacultyDirectoryDetail = async (req, res) => {
  try {
    const { facultyUserId } = req.params;
    if (!mongoose.isValidObjectId(facultyUserId)) {
      return res.status(400).json({ success: false, message: "Invalid faculty id" });
    }

    const facUser = await user.findById(facultyUserId).select("-password");
    if (!facUser || facUser.role !== "faculty") {
      return res.status(404).json({ success: false, message: "Faculty user not found" });
    }

    const profile = await FacultyProfile.findOne({ user: facUser._id })
      .populate("department", "name code")
      .lean();

    const hr = await Faculty.findOne({
      $or: [{ portalUser: facUser._id }, { officialEmail: String(facUser.email).toLowerCase() }],
    })
      .select("employeeId departmentName designation isActive portalUser officialEmail")
      .lean();

    const assignedProfiles = await studentProfilePopulate(
      StudentProfile.find({ assignedFaculty: facultyUserId }).sort({ updatedAt: -1 }).limit(300)
    ).lean();

    const assignedStudents = assignedProfiles
      .filter((p) => p.user && p.user.role === "student")
      .map((p) => ({
        userId: p.user._id.toString(),
        name: p.user.name,
        email: p.user.email,
        enrollmentNo: p.enrollmentNo || "",
        admissionStatus: p.admissionStatus,
        department: p.department,
        course: p.course,
        currentSemester: p.currentSemester,
      }));

    return res.json({
      success: true,
      user: facultyUserPublicForAdmin(facUser),
      profile,
      employment: hr
        ? {
            employeeId: hr.employeeId,
            departmentName: hr.departmentName || "",
            designation: hr.designation,
            isActive: hr.isActive !== false,
            officialEmail: hr.officialEmail,
          }
        : null,
      assignedStudents,
      assignedCount: assignedStudents.length,
    });
  } catch (e) {
    console.error("getAdminFacultyDirectoryDetail", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
