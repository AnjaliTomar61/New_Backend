import { Subject } from "../models/subject.model.js";

export const createSubject = async (req, res) => {
  const { course, semester, code, name, credits, faculty } = req.body;
  const subject = await Subject.create({ course, semester, code, name, credits, faculty });
  return res.status(201).json({ success: true, message: "Subject created", subject });
};

export const listSubjects = async (req, res) => {
  const { semesterId, courseId } = req.query;
  const q = {};
  if (semesterId) q.semester = semesterId;
  if (courseId) q.course = courseId;
  const subjects = await Subject.find(q)
    .populate("faculty", "name email role")
    .sort({ createdAt: -1 });
  return res.json({ success: true, subjects });
};

export const updateSubject = async (req, res) => {
  const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
  return res.json({ success: true, message: "Subject updated", subject });
};

export const deleteSubject = async (req, res) => {
  const subject = await Subject.findByIdAndDelete(req.params.id);
  if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
  return res.json({ success: true, message: "Subject deleted" });
};

