import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", unique: true, required: true },
    enrollmentNo: { type: String, unique: true, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    currentSemester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", default: null },
    admissionStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const StudentProfile = mongoose.model("StudentProfile", studentProfileSchema);

