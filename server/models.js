import mongoose from "mongoose";
const { Schema, model } = mongoose;
export const User = model(
  "User",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      phone: String,
      password: { type: String, required: true },
      role: {
        type: String,
        enum: ["patient", "staff", "admin"],
        default: "patient",
      },
    },
    { timestamps: true },
  ),
);
export const Department = model(
  "Department",
  new Schema({
    name: { type: String, required: true, unique: true },
    description: String,
    code: { type: String, required: true },
  }),
);
export const Doctor = model(
  "Doctor",
  new Schema({
    name: { type: String, required: true },
    qualification: String,
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    available: { type: Boolean, default: true },
  }),
);
const appt = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    ticket: String,
    status: {
      type: String,
      enum: ["booked", "checkedin", "serving", "completed", "cancelled"],
      default: "booked",
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
// A slot can only hold one non cancelled appointment, enforced by the database.
appt.index(
  { doctor: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
export const Appointment = model("Appointment", appt);
