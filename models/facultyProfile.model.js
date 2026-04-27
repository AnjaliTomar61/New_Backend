import mongoose from "mongoose";

/**
 * Faculty teaching & professional data linked 1:1 to `user`.
 * Name, email, mobile, password, gender, DOB, short bio → use `user` model.
 */
const facultyProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", unique: true, required: true },
    employeeId: { type: String, unique: true, sparse: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    designation: { type: String, default: "Lecturer" },
    isActive: { type: Boolean, default: true },

    officeRoom: { type: String, trim: true, default: "" },
    specialization: { type: String, trim: true, default: "" },
    qualification: { type: String, trim: true, default: "" },
    profilePhoto: { type: String, trim: true, default: "" },
    subjects: [{ type: String, trim: true }],
    experienceYears: { type: Number, min: 0, default: null },
    experienceSummary: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const FacultyProfile = mongoose.model("FacultyProfile", facultyProfileSchema);
