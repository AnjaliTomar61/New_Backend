import mongoose from "mongoose";

const facultyProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", unique: true, required: true },
    employeeId: { type: String, unique: true, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    designation: { type: String, default: "Lecturer" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const FacultyProfile = mongoose.model("FacultyProfile", facultyProfileSchema);

