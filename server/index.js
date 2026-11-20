import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Department, Doctor, Appointment } from "./models.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

const TIMES = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
];
const LIVE = ["booked", "checkedin", "serving"];
const MIN_PER_PATIENT = 12;
const today = () => new Date().toISOString().slice(0, 10);
const wrap = (f) => (req, res, next) => f(req, res, next).catch(next);
const fail = (res, code, message) => res.status(code).json({ message });
const sign = (u) =>
  jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const auth =
  (...roles) =>
  (req, res, next) => {
    try {
      req.user = jwt.verify(
        (req.headers.authorization || "").replace("Bearer ", ""),
        process.env.JWT_SECRET,
      );
    } catch {
      return fail(res, 401, "Sign in to continue.");
    }
    if (roles.length && !roles.includes(req.user.role))
      return fail(res, 403, "You do not have access to this action.");
    next();
  };
const populate = (q) =>
  q
    .populate({ path: "doctor", populate: "department" })
    .populate("patient", "name");

// Auth
app.post(
  "/api/auth/register",
  wrap(async (req, res) => {
    const { name = "", email = "", phone = "", password = "" } = req.body;
    if (name.trim().length < 2) return fail(res, 400, "Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email))
      return fail(res, 400, "Enter a valid email address.");
    if (!/^\d{10}$/.test(phone))
      return fail(res, 400, "Enter a 10 digit mobile number.");
    if (password.length < 8)
      return fail(res, 400, "Password needs at least 8 characters.");
    if (await User.findOne({ email: email.toLowerCase() }))
      return fail(
        res,
        409,
        "That email is already registered. Sign in instead.",
      );
    const u = await User.create({
      name: name.trim(),
      email,
      phone,
      password: await bcrypt.hash(password, 10),
    });
    res.status(201).json({ token: sign(u), user: pub(u) });
  }),
);
app.post(
  "/api/auth/login",
  wrap(async (req, res) => {
    const u = await User.findOne({
      email: String(req.body.email || "").toLowerCase(),
    });
    if (
      !u ||
      !(await bcrypt.compare(String(req.body.password || ""), u.password))
    )
      return fail(res, 401, "Email or password is incorrect.");
    res.json({ token: sign(u), user: pub(u) });
  }),
);
app.get(
  "/api/me",
  auth(),
  wrap(async (req, res) => res.json(pub(await User.findById(req.user.id)))),
);

// Public catalogue
app.get(
  "/api/departments",
  wrap(async (_q, res) => res.json(await Department.find().sort("name"))),
);
app.get(
  "/api/doctors",
  wrap(async (req, res) => {
    res.json(
      await Doctor.find(
        req.query.department ? { department: req.query.department } : {},
      ).populate("department"),
    );
  }),
);
app.get(
  "/api/doctors/:id/slots",
  wrap(async (req, res) => {
    const taken = await Appointment.find({
      doctor: req.params.id,
      date: req.query.date,
      active: true,
    }).distinct("time");
    res.json({ times: TIMES, taken });
  }),
);

// Patient
app.post(
  "/api/appointments",
  auth("patient"),
  wrap(async (req, res) => {
    const { doctor, date, time } = req.body;
    const d = await Doctor.findById(doctor).populate("department");
    if (!d || !d.available)
      return fail(res, 400, "That doctor is not taking bookings.");
    if (
      !TIMES.includes(time) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date < today()
    )
      return fail(res, 400, "Choose a valid future date and time.");
    const n = await Appointment.countDocuments({
      date,
      doctor: {
        $in: await Doctor.find({ department: d.department._id }).distinct(
          "_id",
        ),
      },
    });
    try {
      const a = await Appointment.create({
        patient: req.user.id,
        doctor,
        date,
        time,
        ticket: d.department.code + String(n + 1).padStart(3, "0"),
      });
      res.status(201).json(await populate(Appointment.findById(a._id)));
    } catch (e) {
      if (e.code === 11000)
        return fail(res, 409, "That slot was just taken. Pick another time.");
      throw e;
    }
  }),
);
app.get(
  "/api/appointments/mine",
  auth("patient"),
  wrap(async (req, res) => {
    res.json(
      await populate(
        Appointment.find({ patient: req.user.id }).sort("-date -time"),
      ),
    );
  }),
);
app.patch(
  "/api/appointments/:id/cancel",
  auth("patient"),
  wrap(async (req, res) => {
    const a = await Appointment.findOne({
      _id: req.params.id,
      patient: req.user.id,
    });
    if (!a) return fail(res, 404, "Appointment not found.");
    if (a.status !== "booked")
      return fail(
        res,
        409,
        "Only appointments that are not yet checked in can be cancelled.",
      );
    a.status = "cancelled";
    a.active = false;
    await a.save();
    res.json(a);
  }),
);
app.get(
  "/api/queue/mine",
  auth("patient"),
  wrap(async (req, res) => {
    const mine = await populate(
      Appointment.findOne({ patient: req.user.id, status: { $in: LIVE } }).sort(
        "date time",
      ),
    );
    if (!mine) return res.json(null);
    if (mine.date !== today())
      return res.json({ appointment: mine, opensOn: mine.date });
    const line = await Appointment.find({
      doctor: mine.doctor._id,
      date: today(),
      status: { $in: LIVE },
    }).sort("time createdAt");
    const position = line.findIndex((x) => x._id.equals(mine._id)) + 1;
    res.json({
      appointment: mine,
      position,
      waitMinutes: position * MIN_PER_PATIENT,
      serving: line.find((x) => x.status === "serving")?.ticket || null,
    });
  }),
);

// Staff
const NEXT = {
  booked: ["checkedin", "cancelled"],
  checkedin: ["serving", "cancelled"],
  serving: ["completed", "cancelled"],
};
app.get(
  "/api/staff/queue",
  auth("staff", "admin"),
  wrap(async (_q, res) => {
    res.json(
      await populate(
        Appointment.find({ date: today() }).sort("time createdAt"),
      ),
    );
  }),
);
app.patch(
  "/api/staff/appointments/:id",
  auth("staff", "admin"),
  wrap(async (req, res) => {
    const a = await Appointment.findById(req.params.id);
    if (!a) return fail(res, 404, "Appointment not found.");
    if (!(NEXT[a.status] || []).includes(req.body.status))
      return fail(
        res,
        409,
        `A ${a.status} ticket cannot move to ${req.body.status}.`,
      );
    a.status = req.body.status;
    if (a.status === "cancelled") a.active = false;
    await a.save();
    res.json(a);
  }),
);
app.post(
  "/api/staff/call-next",
  auth("staff", "admin"),
  wrap(async (_q, res) => {
    if (await Appointment.exists({ date: today(), status: "serving" }))
      return fail(res, 409, "Complete the current ticket first.");
    const a = await Appointment.findOne({
      date: today(),
      status: "checkedin",
    }).sort("time createdAt");
    if (!a) return fail(res, 404, "No checked in patients to call.");
    a.status = "serving";
    await a.save();
    res.json(a);
  }),
);

// Admin
app.get(
  "/api/admin/stats",
  auth("admin"),
  wrap(async (_q, res) => {
    const by = await Appointment.aggregate([
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]);
    res.json({
      total: by.reduce((s, x) => s + x.n, 0),
      byStatus: Object.fromEntries(by.map((x) => [x._id, x.n])),
      doctors: await Doctor.countDocuments(),
      departments: await Department.countDocuments(),
    });
  }),
);
app.post(
  "/api/admin/departments",
  auth("admin"),
  wrap(async (req, res) => {
    const { name = "", description = "" } = req.body;
    if (name.trim().length < 2)
      return fail(res, 400, "Enter a department name.");
    res
      .status(201)
      .json(
        await Department.create({
          name: name.trim(),
          description,
          code: name.trim()[0].toUpperCase(),
        }),
      );
  }),
);
app.post(
  "/api/admin/doctors",
  auth("admin"),
  wrap(async (req, res) => {
    const { name = "", qualification = "", department } = req.body;
    if (name.trim().length < 2 || !department)
      return fail(res, 400, "Enter a name and choose a department.");
    res
      .status(201)
      .json(
        await Doctor.create({ name: name.trim(), qualification, department }),
      );
  }),
);
app.patch(
  "/api/admin/doctors/:id",
  auth("admin"),
  wrap(async (req, res) => {
    res.json(
      await Doctor.findByIdAndUpdate(
        req.params.id,
        { available: !!req.body.available },
        { new: true },
      ),
    );
  }),
);

app.use((_q, res) => fail(res, 404, "Route not found."));
app.use((e, _q, res, _n) => {
  console.error(e);
  fail(res, 500, "Something went wrong on our side. Try again.");
});

if (!process.env.JWT_SECRET) throw new Error("Set JWT_SECRET in server/.env");
mongoose
  .connect(process.env.MONGO_URI)
  .then(() =>
    app.listen(process.env.PORT || 5000, () => console.log("API ready")),
  )
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
