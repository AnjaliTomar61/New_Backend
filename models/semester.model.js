import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    number: { type: Number, required: true, min: 1, max: 12 },
    title: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

semesterSchema.index({ course: 1, number: 1 }, { unique: true });

export const Semester = mongoose.model("Semester", semesterSchema);

