import mongoose from "mongoose";
import { AcademicResult } from "../models/academicResult.model.js";
import { StudentProfile } from "../models/studentProfile.model.js";
import { user } from "../models/user.model.js";

function normalizeLines(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => ({
    subject: row.subject && mongoose.isValidObjectId(row.subject) ? row.subject : null,
    subjectLabel: String(row.subjectLabel ?? "").trim(),
    maxMarks: Math.max(0, Number(row.maxMarks) || 0),
    obtained: Math.max(0, Number(row.obtained) || 0),
    grade: String(row.grade ?? "").trim(),
  }));
}

const SEMESTER_POP = {
  path: "semester",
  select: "number title",
  populate: { path: "course", select: "courseName courseCode" },
};

async function populateResult(doc) {
  if (!doc) return null;
  return AcademicResult.findById(doc._id || doc)
    .populate("student", "name email role")
    .populate(SEMESTER_POP)
    .populate("lines.subject", "code name")
    .lean();
}

export const listMyResults = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Students only" });
    }
    const items = await AcademicResult.find({ student: req.user.id, published: true })
      .populate(SEMESTER_POP)
      .populate("lines.subject", "code name")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ success: true, results: items });
  } catch (e) {
    console.error("listMyResults", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** Faculty: published results for assigned students only. */
export const listFacultyMenteeResults = async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ success: false, message: "Faculty only" });
    }
    const profiles = await StudentProfile.find({ assignedFaculty: req.user.id }).select("user").lean();
    const ids = profiles.map((p) => p.user).filter(Boolean);
    if (!ids.length) {
      return res.json({ success: true, results: [], hint: "You have no assigned students yet." });
    }
    const items = await AcademicResult.find({ student: { $in: ids }, published: true })
      .populate("student", "name email")
      .populate(SEMESTER_POP)
      .populate("lines.subject", "code name")
      .sort({ student: 1, updatedAt: -1 })
      .limit(400)
      .lean();
    return res.json({ success: true, results: items });
  } catch (e) {
    console.error("listFacultyMenteeResults", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listAdminResults = async (req, res) => {
  try {
    const q = {};
    if (req.query.studentId && mongoose.isValidObjectId(req.query.studentId)) {
      q.student = req.query.studentId;
    }
    if (req.query.semesterId && mongoose.isValidObjectId(req.query.semesterId)) {
      q.semester = req.query.semesterId;
    }
    const items = await AcademicResult.find(q)
      .populate("student", "name email role")
      .populate(SEMESTER_POP)
      .populate("lines.subject", "code name")
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean();
    return res.json({ success: true, results: items });
  } catch (e) {
    console.error("listAdminResults", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createAdminResult = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { student, semester, examTitle, lines, published, remarks } = body;

    if (!mongoose.isValidObjectId(student) || !mongoose.isValidObjectId(semester)) {
      return res.status(400).json({ success: false, message: "Valid student and semester ids are required" });
    }
    const stu = await user.findById(student).select("role");
    if (!stu || stu.role !== "student") {
      return res.status(400).json({ success: false, message: "Target user must be a student" });
    }

    const title = String(examTitle || "").trim();
    if (!title) return res.status(400).json({ success: false, message: "examTitle is required" });

    const doc = await AcademicResult.create({
      student,
      semester,
      examTitle: title,
      published: Boolean(published),
      lines: normalizeLines(lines),
      remarks: String(remarks ?? "").trim(),
    });
    const out = await populateResult(doc);
    return res.status(201).json({ success: true, message: "Result record created", result: out });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A result with this exam title already exists for this student and semester.",
      });
    }
    console.error("createAdminResult", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
};

export const updateAdminResult = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const doc = await AcademicResult.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    const body = req.body && typeof req.body === "object" ? req.body : {};

    if (body.examTitle !== undefined) {
      const t = String(body.examTitle || "").trim();
      if (!t) return res.status(400).json({ success: false, message: "examTitle cannot be empty" });
      doc.examTitle = t;
    }
    if (body.published !== undefined) doc.published = Boolean(body.published);
    if (body.remarks !== undefined) doc.remarks = String(body.remarks ?? "").trim();
    if (body.lines !== undefined) doc.lines = normalizeLines(body.lines);

    if (body.student !== undefined || body.semester !== undefined) {
      if (body.student !== undefined) {
        if (!mongoose.isValidObjectId(body.student)) {
          return res.status(400).json({ success: false, message: "Invalid student id" });
        }
        const stu = await user.findById(body.student).select("role");
        if (!stu || stu.role !== "student") {
          return res.status(400).json({ success: false, message: "Target must be a student" });
        }
        doc.student = body.student;
      }
      if (body.semester !== undefined) {
        if (!mongoose.isValidObjectId(body.semester)) {
          return res.status(400).json({ success: false, message: "Invalid semester id" });
        }
        doc.semester = body.semester;
      }
    }

    await doc.save();
    const out = await populateResult(doc);
    return res.json({ success: true, message: "Result updated", result: out });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate exam title for this student and semester." });
    }
    console.error("updateAdminResult", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteAdminResult = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const doc = await AcademicResult.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted" });
  } catch (e) {
    console.error("deleteAdminResult", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
