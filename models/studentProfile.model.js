import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", unique: true, required: true },
    enrollmentNo: { type: String, unique: true, sparse: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
    currentSemester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", default: null },
    admissionStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    /** Faculty mentor who may update academic fields for this student (admin assigns). */
    assignedFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
      index: true,
    },

    /** Personal / contact details (filled after signup) */
    currentAddress: { type: addressSchema, default: () => ({}) },
    permanentAddress: { type: addressSchema, default: () => ({}) },
    guardianName: { type: String, trim: true, default: "" },
    guardianPhone: { type: String, trim: true, default: "" },
    guardianRelation: { type: String, trim: true, default: "" },
    bloodGroup: { type: String, trim: true, default: "" },
    documentsNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const StudentProfile = mongoose.model("StudentProfile", studentProfileSchema);
