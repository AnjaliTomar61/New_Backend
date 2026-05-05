import mongoose from "mongoose";
import { Subject } from "../models/subject.model.js";
import { Semester } from "../models/semester.model.js";
import { Course } from "../models/course.model.js";
import { user as User } from "../models/user.model.js";

const COURSE_POP = { path: "course", select: "courseName courseCode", populate: { path: "department", select: "name code" } };
const SEM_POP = { path: "semester", select: "number title", populate: { path: "course", select: "courseName courseCode" } };
const FACULTY_POP = { path: "faculty", select: "name email role" };

async function populateSubject(doc) {
  if (!doc) return null;
  return Subject.findById(doc._id || doc).populate(COURSE_POP).populate(SEM_POP).populate(FACULTY_POP).lean();
}

export const createSubject = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { course, semester, code, name, credits, faculty } = body;

    if (!mongoose.isValidObjectId(course) || !mongoose.isValidObjectId(semester)) {
      return res.status(400).json({ success: false, message: "Valid course and semester ids are required" });
    }

    const courseDoc = await Course.findById(course).select("_id");
    if (!courseDoc) return res.status(400).json({ success: false, message: "Course not found" });

    const semDoc = await Semester.findById(semester).select("course");
    if (!semDoc) return res.status(400).json({ success: false, message: "Semester not found" });
    if (String(semDoc.course) !== String(course)) {
      return res.status(400).json({ success: false, message: "Semester does not belong to this course" });
    }

    let facultyId = null;
    if (faculty != null && faculty !== "") {
      if (!mongoose.isValidObjectId(faculty)) {
        return res.status(400).json({ success: false, message: "Invalid faculty id" });
      }
      const fac = await User.findById(faculty).select("role");
      if (!fac || fac.role !== "faculty") {
        return res.status(400).json({ success: false, message: "faculty must be a faculty user id" });
      }
      facultyId = faculty;
    }

    const c = String(code || "").trim();
    const n = String(name || "").trim();
    if (!c || !n) {
      return res.status(400).json({ success: false, message: "code and name are required" });
    }

    const subject = await Subject.create({
      course,
      semester,
      code: c,
      name: n,
      credits: Number(credits) || 0,
      faculty: facultyId,
    });

    const out = await populateSubject(subject);
    return res.status(201).json({ success: true, message: "Subject created", subject: out });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate subject code for this semester." });
    }
    console.error("createSubject", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listSubjects = async (req, res) => {
  try {
    const { semesterId, courseId } = req.query;
    const q = {};
    if (semesterId && mongoose.isValidObjectId(semesterId)) q.semester = semesterId;
    if (courseId && mongoose.isValidObjectId(courseId)) q.course = courseId;
    const subjects = await Subject.find(q)
      .populate(COURSE_POP)
      .populate(SEM_POP)
      .populate(FACULTY_POP)
      .sort({ semester: 1, code: 1 })
      .lean();
    return res.json({ success: true, subjects });
  } catch (e) {
    console.error("listSubjects", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid subject id" });
    }
    const subject = await Subject.findById(id);
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });

    const body = req.body && typeof req.body === "object" ? req.body : {};

    // course/semester changes must remain consistent
    const nextCourse = body.course !== undefined ? body.course : subject.course;
    const nextSemester = body.semester !== undefined ? body.semester : subject.semester;

    if (body.course !== undefined || body.semester !== undefined) {
      if (!mongoose.isValidObjectId(nextCourse) || !mongoose.isValidObjectId(nextSemester)) {
        return res.status(400).json({ success: false, message: "Valid course and semester ids are required" });
      }
      const semDoc = await Semester.findById(nextSemester).select("course");
      if (!semDoc) return res.status(400).json({ success: false, message: "Semester not found" });
      if (String(semDoc.course) !== String(nextCourse)) {
        return res.status(400).json({ success: false, message: "Semester does not belong to this course" });
      }
      subject.course = nextCourse;
      subject.semester = nextSemester;
    }

    if (body.code !== undefined) {
      const c = String(body.code || "").trim();
      if (!c) return res.status(400).json({ success: false, message: "code cannot be empty" });
      subject.code = c;
    }
    if (body.name !== undefined) {
      const n = String(body.name || "").trim();
      if (!n) return res.status(400).json({ success: false, message: "name cannot be empty" });
      subject.name = n;
    }
    if (body.credits !== undefined) subject.credits = Number(body.credits) || 0;

    if (body.faculty !== undefined) {
      if (body.faculty === null || body.faculty === "") {
        subject.faculty = null;
      } else if (!mongoose.isValidObjectId(body.faculty)) {
        return res.status(400).json({ success: false, message: "Invalid faculty id" });
      } else {
        const fac = await User.findById(body.faculty).select("role");
        if (!fac || fac.role !== "faculty") {
          return res.status(400).json({ success: false, message: "faculty must be a faculty user id" });
        }
        subject.faculty = body.faculty;
      }
    }

    await subject.save();
    const out = await populateSubject(subject);
    return res.json({ success: true, message: "Subject updated", subject: out });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate subject code for this semester." });
    }
    console.error("updateSubject", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid subject id" });
    }
    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    return res.json({ success: true, message: "Subject deleted" });
  } catch (e) {
    console.error("deleteSubject", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

