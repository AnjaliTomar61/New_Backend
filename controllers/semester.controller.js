import mongoose from "mongoose";
import { Semester } from "../models/semester.model.js";
import { Course } from "../models/course.model.js";
import { StudentProfile } from "../models/studentProfile.model.js";
import { Subject } from "../models/subject.model.js";

const COURSE_POPULATE = {
  path: "course",
  select: "courseName courseCode totalSemesters",
  populate: { path: "department", select: "name code" },
};

const UPDATE_FIELDS = ["number", "title", "isActive", "course"];

async function populateSemester(doc) {
  if (!doc) return null;
  return Semester.findById(doc._id || doc).populate(COURSE_POPULATE).lean();
}

export const createSemester = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { course, number, title, isActive } = body;

    if (!course || !mongoose.isValidObjectId(course)) {
      return res.status(400).json({ success: false, message: "Valid course id is required" });
    }

    const n = Number(number);
    if (!Number.isFinite(n) || n < 1 || n > 12) {
      return res.status(400).json({ success: false, message: "Semester number must be between 1 and 12" });
    }

    const courseDoc = await Course.findById(course).select("_id totalSemesters");
    if (!courseDoc) {
      return res.status(400).json({ success: false, message: "Course not found" });
    }

    const maxSem = Math.min(Number(courseDoc.totalSemesters) || 12, 12);
    if (n > maxSem) {
      return res.status(400).json({
        success: false,
        message: `This course is configured for ${maxSem} semester(s); number cannot exceed ${maxSem}.`,
      });
    }

    const sem = await Semester.create({
      course,
      number: n,
      title: title != null ? String(title).trim() : "",
      isActive: isActive !== false,
    });

    const populated = await populateSemester(sem);
    return res.status(201).json({ success: true, message: "Semester created", semester: populated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A semester with this number already exists for this course",
      });
    }
    console.error("createSemester", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
};

export const listSemesters = async (req, res) => {
  try {
    const { courseId } = req.query;
    const q = mongoose.isValidObjectId(courseId) ? { course: courseId } : {};
    const semesters = await Semester.find(q)
      .populate(COURSE_POPULATE)
      .sort({ course: 1, number: 1 })
      .lean();

    return res.json({ success: true, semesters });
  } catch (e) {
    console.error("listSemesters", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateSemester = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid semester id" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const set = {};
    for (const k of UPDATE_FIELDS) {
      if (body[k] !== undefined) set[k] = body[k];
    }

    const existing = await Semester.findById(id).select("number course");
    if (!existing) return res.status(404).json({ success: false, message: "Semester not found" });

    const nextCourseId = set.course !== undefined ? set.course : existing.course;
    const nextNumber = set.number !== undefined ? Number(set.number) : existing.number;

    if (set.course !== undefined && (nextCourseId == null || !mongoose.isValidObjectId(nextCourseId))) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }

    const courseDoc = await Course.findById(nextCourseId).select("_id totalSemesters");
    if (!courseDoc) return res.status(400).json({ success: false, message: "Course not found" });

    const maxSem = Math.min(Number(courseDoc.totalSemesters) || 12, 12);
    const n = Number(nextNumber);
    if (!Number.isFinite(n) || n < 1 || n > 12 || n > maxSem) {
      return res.status(400).json({
        success: false,
        message: `Semester number must be 1–${maxSem} for this course (and at most 12).`,
      });
    }

    if (set.number !== undefined) set.number = n;

    const semester = await Semester.findByIdAndUpdate(id, set, { new: true, runValidators: true });
    if (!semester) return res.status(404).json({ success: false, message: "Semester not found" });

    const populated = await populateSemester(semester);
    return res.json({ success: true, message: "Semester updated", semester: populated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate semester number for this course" });
    }
    console.error("updateSemester", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
};

export const toggleSemesterActive = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid semester id" });
    }

    const sem = await Semester.findById(id);
    if (!sem) return res.status(404).json({ success: false, message: "Semester not found" });

    sem.isActive = !sem.isActive;
    await sem.save();

    const populated = await populateSemester(sem);
    return res.json({ success: true, message: "Semester status updated", semester: populated });
  } catch (e) {
    console.error("toggleSemesterActive", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteSemester = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid semester id" });
    }

    const [studentCount, subjectCount] = await Promise.all([
      StudentProfile.countDocuments({ currentSemester: id }),
      Subject.countDocuments({ semester: id }),
    ]);

    if (studentCount > 0 || subjectCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${studentCount} student profile(s) use this as current semester and ${subjectCount} subject row(s) are linked. Reassign or remove them first.`,
      });
    }

    const semester = await Semester.findByIdAndDelete(id);
    if (!semester) return res.status(404).json({ success: false, message: "Semester not found" });

    return res.json({ success: true, message: "Semester deleted" });
  } catch (e) {
    console.error("deleteSemester", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
