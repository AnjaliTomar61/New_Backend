import mongoose from "mongoose";

const lineSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
    subjectLabel: { type: String, trim: true, default: "" },
    maxMarks: { type: Number, default: 100, min: 0 },
    obtained: { type: Number, default: 0, min: 0 },
    grade: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const academicResultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
    examTitle: { type: String, required: true, trim: true },
    published: { type: Boolean, default: false },
    lines: { type: [lineSchema], default: [] },
    remarks: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

academicResultSchema.index({ student: 1, semester: 1, examTitle: 1 }, { unique: true });

export const AcademicResult = mongoose.model("AcademicResult", academicResultSchema);
