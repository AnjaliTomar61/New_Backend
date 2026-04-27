import mongoose from "mongoose";
import { TimetableSlot, TIMETABLE_DAY_ORDER } from "../models/timetableSlot.model.js";
import { Subject } from "../models/subject.model.js";
import { StudentProfile } from "../models/studentProfile.model.js";

const SUBJECT_POP = {
  path: "subject",
  select: "code name credits faculty semester",
  populate: { path: "faculty", select: "name email" },
};

function sortSlots(slots) {
  return [...slots].sort((a, b) => {
    const da = TIMETABLE_DAY_ORDER[a.day] ?? 99;
    const db = TIMETABLE_DAY_ORDER[b.day] ?? 99;
    if (da !== db) return da - db;
    return String(a.startTime).localeCompare(String(b.startTime));
  });
}

export const getMyTimetable = async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "student") {
      const prof = await StudentProfile.findOne({ user: req.user.id }).select("currentSemester").lean();
      if (!prof?.currentSemester) {
        return res.json({
          success: true,
          slots: [],
          hint: "Ask your admin to assign a course and current semester on your profile to see the class timetable.",
        });
      }
      const slots = await TimetableSlot.find({ semester: prof.currentSemester }).populate(SUBJECT_POP).lean();
      return res.json({ success: true, slots: sortSlots(slots) });
    }
    if (role === "faculty") {
      const subIds = await Subject.find({ faculty: req.user.id }).distinct("_id");
      if (!subIds.length) {
        return res.json({
          success: true,
          slots: [],
          hint: "No subjects are assigned to you yet. When admin links you to subjects, your teaching slots appear here.",
        });
      }
      const slots = await TimetableSlot.find({ subject: { $in: subIds } }).populate(SUBJECT_POP).lean();
      return res.json({ success: true, slots: sortSlots(slots) });
    }
    return res.status(403).json({ success: false, message: "Forbidden" });
  } catch (e) {
    console.error("getMyTimetable", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listTimetableBySemester = async (req, res) => {
  try {
    const { semesterId } = req.query;
    if (!mongoose.isValidObjectId(semesterId)) {
      return res.status(400).json({ success: false, message: "Query semesterId must be a valid id" });
    }
    const slots = await TimetableSlot.find({ semester: semesterId }).populate(SUBJECT_POP).lean();
    return res.json({ success: true, slots: sortSlots(slots) });
  } catch (e) {
    console.error("listTimetableBySemester", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createTimetableSlot = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { semester, subject, day, startTime, endTime, room, note } = body;

    if (!mongoose.isValidObjectId(semester) || !mongoose.isValidObjectId(subject)) {
      return res.status(400).json({ success: false, message: "Valid semester and subject ids are required" });
    }

    const sub = await Subject.findById(subject).select("semester");
    if (!sub) return res.status(400).json({ success: false, message: "Subject not found" });
    if (String(sub.semester) !== String(semester)) {
      return res.status(400).json({ success: false, message: "Subject does not belong to this semester" });
    }

    const slot = await TimetableSlot.create({
      semester,
      subject,
      day: String(day || "").toLowerCase().trim(),
      startTime: String(startTime || "").trim(),
      endTime: String(endTime || "").trim(),
      room: String(room ?? "").trim(),
      note: String(note ?? "").trim(),
    });

    const out = await TimetableSlot.findById(slot._id).populate(SUBJECT_POP).lean();
    return res.status(201).json({ success: true, message: "Slot added", slot: out });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A slot already exists for this semester, subject, day and start time.",
      });
    }
    if (e?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: e.message || "Invalid data" });
    }
    console.error("createTimetableSlot", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateTimetableSlot = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const slot = await TimetableSlot.findById(id);
    if (!slot) return res.status(404).json({ success: false, message: "Slot not found" });

    const semester = body.semester != null ? body.semester : slot.semester;
    const subject = body.subject != null ? body.subject : slot.subject;

    if (body.subject != null || body.semester != null) {
      if (!mongoose.isValidObjectId(semester) || !mongoose.isValidObjectId(subject)) {
        return res.status(400).json({ success: false, message: "Valid semester and subject ids are required" });
      }
      const sub = await Subject.findById(subject).select("semester");
      if (!sub) return res.status(400).json({ success: false, message: "Subject not found" });
      if (String(sub.semester) !== String(semester)) {
        return res.status(400).json({ success: false, message: "Subject does not belong to this semester" });
      }
      slot.semester = semester;
      slot.subject = subject;
    }

    if (body.day !== undefined) slot.day = String(body.day).toLowerCase().trim();
    if (body.startTime !== undefined) slot.startTime = String(body.startTime).trim();
    if (body.endTime !== undefined) slot.endTime = String(body.endTime).trim();
    if (body.room !== undefined) slot.room = String(body.room ?? "").trim();
    if (body.note !== undefined) slot.note = String(body.note ?? "").trim();

    await slot.save();
    const out = await TimetableSlot.findById(slot._id).populate(SUBJECT_POP).lean();
    return res.json({ success: true, message: "Slot updated", slot: out });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate slot for same day and start time." });
    }
    console.error("updateTimetableSlot", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteTimetableSlot = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const slot = await TimetableSlot.findByIdAndDelete(id);
    if (!slot) return res.status(404).json({ success: false, message: "Slot not found" });
    return res.json({ success: true, message: "Slot removed" });
  } catch (e) {
    console.error("deleteTimetableSlot", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
