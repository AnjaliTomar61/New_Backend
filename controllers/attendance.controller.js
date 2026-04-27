import { user } from "../models/user.model.js";
import { Attendance } from "../models/attendance.model.js";
import {
  istDateString,
  mondayYmdOfWeek,
  weekDatesFromMondayYmd,
  dayShortLabel,
} from "../utils/attendanceDates.js";

function summarizeRecord(r) {
  if (!r) return { status: "absent", clockInAt: null, clockOutAt: null };
  if (r.clockOutAt) return { status: "complete", clockInAt: r.clockInAt, clockOutAt: r.clockOutAt };
  if (r.clockInAt) return { status: "in", clockInAt: r.clockInAt, clockOutAt: null };
  return { status: "absent", clockInAt: null, clockOutAt: null };
}

/** Student / faculty: check-in or check-out for today (IST calendar day). */
export const postAttendanceTap = async (req, res) => {
  try {
    if (!["student", "faculty"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Only students and faculty can record attendance" });
    }

    const action = String(req.body?.action || "").toLowerCase().trim();
    if (!["in", "out"].includes(action)) {
      return res.status(400).json({ success: false, message: 'Body "action" must be "in" or "out"' });
    }

    const workDate = istDateString(new Date());
    const uid = req.user.id;
    const now = new Date();

    let doc = await Attendance.findOne({ user: uid, workDate });

    if (action === "in") {
      if (doc?.clockInAt) {
        return res.status(400).json({
          success: false,
          message: "You have already checked in today.",
          record: doc.toObject(),
        });
      }
      if (!doc) {
        doc = await Attendance.create({ user: uid, workDate, clockInAt: now, clockOutAt: null });
      } else {
        doc.clockInAt = now;
        await doc.save();
      }
    } else {
      if (!doc || !doc.clockInAt) {
        return res.status(400).json({ success: false, message: "Check in first before checking out." });
      }
      if (doc.clockOutAt) {
        return res.status(400).json({
          success: false,
          message: "You have already checked out today.",
          record: doc.toObject(),
        });
      }
      doc.clockOutAt = now;
      await doc.save();
    }

    const fresh = await Attendance.findById(doc._id).lean();
    return res.json({
      success: true,
      message: action === "in" ? "Checked in successfully" : "Checked out successfully",
      workDate,
      record: fresh,
      summary: summarizeRecord(fresh),
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Attendance row already exists for today" });
    }
    console.error("postAttendanceTap", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** Today row for current user (for clock UI). */
export const getAttendanceToday = async (req, res) => {
  try {
    if (!["student", "faculty"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const workDate = istDateString(new Date());
    const doc = await Attendance.findOne({ user: req.user.id, workDate }).lean();
    return res.json({
      success: true,
      workDate,
      record: doc,
      summary: summarizeRecord(doc),
    });
  } catch (e) {
    console.error("getAttendanceToday", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

function getWeekRange(weekOffset) {
  const monday = mondayYmdOfWeek(weekOffset);
  const weekDates = weekDatesFromMondayYmd(monday);
  return { monday, weekDates };
}

/** Student / faculty: Mon–Sun week for self. */
export const getMyAttendanceWeek = async (req, res) => {
  try {
    if (!["student", "faculty"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const weekOffset = Number(req.query.weekOffset || 0) || 0;
    const { monday, weekDates } = getWeekRange(weekOffset);
    const recs = await Attendance.find({
      user: req.user.id,
      workDate: { $in: weekDates },
    }).lean();
    const map = new Map(recs.map((r) => [r.workDate, r]));
    const todayYmd = istDateString(new Date());
    const days = weekDates.map((wd) => {
      const r = map.get(wd);
      return {
        workDate: wd,
        dayLabel: dayShortLabel(wd),
        isToday: wd === todayYmd,
        ...summarizeRecord(r),
      };
    });

    return res.json({
      success: true,
      weekStart: weekDates[0],
      weekEnd: weekDates[6],
      mondayYmd: monday,
      todayWorkDate: todayYmd,
      days,
    });
  } catch (e) {
    console.error("getMyAttendanceWeek", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** Admin: matrix of users × Mon–Sun for students or faculty. */
export const getAdminAttendanceMatrix = async (req, res) => {
  try {
    const view = String(req.query.view || "student").toLowerCase();
    if (!["student", "faculty"].includes(view)) {
      return res.status(400).json({ success: false, message: 'Query "view" must be student or faculty' });
    }
    const weekOffset = Number(req.query.weekOffset || 0) || 0;
    const { weekDates } = getWeekRange(weekOffset);

    const people = await user.find({ role: view }).select("name email").sort({ name: 1 }).limit(500).lean();
    const ids = people.map((p) => p._id);
    const recs = await Attendance.find({
      user: { $in: ids },
      workDate: { $in: weekDates },
    }).lean();

    const key = (uid, wd) => `${String(uid)}_${wd}`;
    const map = new Map(recs.map((r) => [key(r.user, r.workDate), r]));

    const rows = people.map((p) => ({
      userId: p._id.toString(),
      name: p.name,
      email: p.email,
      days: weekDates.map((wd) => {
        const r = map.get(key(p._id, wd));
        return {
          workDate: wd,
          dayLabel: dayShortLabel(wd),
          ...summarizeRecord(r),
        };
      }),
    }));

    return res.json({
      success: true,
      view,
      weekStart: weekDates[0],
      weekEnd: weekDates[6],
      weekDates,
      todayWorkDate: istDateString(new Date()),
      rows,
    });
  } catch (e) {
    console.error("getAdminAttendanceMatrix", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
