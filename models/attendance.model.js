import mongoose from "mongoose";

/**
 * One row per user per calendar day (ATTENDANCE_TZ, default Asia/Kolkata).
 * clockInAt / clockOutAt are stored as real Date instants (UTC in Mongo).
 */
const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    workDate: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    clockInAt: { type: Date, default: null },
    clockOutAt: { type: Date, default: null },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, workDate: 1 }, { unique: true });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
