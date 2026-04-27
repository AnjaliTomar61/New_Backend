import { Semester } from "../models/semester.model.js";

export const createSemester = async (req, res) => {
  const { course, number, title } = req.body;
  const sem = await Semester.create({ course, number, title });
  return res.status(201).json({ success: true, message: "Semester created", semester: sem });
};

export const listSemesters = async (req, res) => {
  const { courseId } = req.query;
  const q = courseId ? { course: courseId } : {};
  const semesters = await Semester.find(q).sort({ course: 1, number: 1 });
  return res.json({ success: true, semesters });
};

export const updateSemester = async (req, res) => {
  const semester = await Semester.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!semester) return res.status(404).json({ success: false, message: "Semester not found" });
  return res.json({ success: true, message: "Semester updated", semester });
};

export const deleteSemester = async (req, res) => {
  const semester = await Semester.findByIdAndDelete(req.params.id);
  if (!semester) return res.status(404).json({ success: false, message: "Semester not found" });
  return res.json({ success: true, message: "Semester deleted" });
};

