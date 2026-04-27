import mongoose from "mongoose";

/** Extended admin details after account creation (separate from auth user row). */
const adminProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", unique: true, required: true },
    jobTitle: { type: String, trim: true, default: "" },
    officeExtension: { type: String, trim: true, default: "" },
    officeLocation: { type: String, trim: true, default: "" },
    alternatePhone: { type: String, trim: true, default: "" },
    joiningDate: { type: Date, default: null },
    displayTitle: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const AdminProfile = mongoose.model("AdminProfile", adminProfileSchema);
