import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    credits: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null }, // role=faculty user
  },
  { timestamps: true }
);

subjectSchema.index({ semester: 1, code: 1 }, { unique: true });

export const Subject = mongoose.model("Subject", subjectSchema);

