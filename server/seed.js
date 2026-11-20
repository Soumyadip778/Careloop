import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Department, Doctor, Appointment } from "./models.js";
await mongoose.connect(process.env.MONGO_URI);
await Promise.all(
  [User, Department, Doctor, Appointment].map((m) => m.deleteMany({})),
);
const d = Object.fromEntries(
  (
    await Department.insertMany(
      [
        [
          "Cardiology",
          "Heart rhythm, blood pressure and chest pain reviews.",
          "C",
        ],
        ["Orthopaedics", "Bones, joints and sports injuries.", "O"],
        ["Paediatrics", "Child health, vaccines and growth checks.", "P"],
        ["Dermatology", "Skin, hair and nail conditions.", "D"],
        ["General medicine", "Fever, infections and routine adult care.", "G"],
        ["Ophthalmology", "Eye tests, cataract and retina care.", "E"],
      ].map(([name, description, code]) => ({ name, description, code })),
    )
  ).map((x) => [x.name, x._id]),
);
await Doctor.insertMany(
  [
    ["Dr Anita Mohapatra", "MD Cardiology", "Cardiology"],
    ["Dr Suresh Nayak", "DM Cardiology", "Cardiology"],
    ["Dr Rakesh Pradhan", "MS Orthopaedics", "Orthopaedics"],
    ["Dr Meera Sahoo", "MD Paediatrics", "Paediatrics"],
    ["Dr Farhan Qureshi", "MD Dermatology", "Dermatology"],
    ["Dr Lipsa Behera", "MD General medicine", "General medicine"],
    ["Dr Biswajit Rout", "MS Ophthalmology", "Ophthalmology"],
  ].map(([name, qualification, dep]) => ({
    name,
    qualification,
    department: d[dep],
  })),
);
const pw = await bcrypt.hash("Password123", 10);
await User.insertMany([
  {
    name: "Sunita Jena",
    email: "staff@careloop.test",
    password: pw,
    role: "staff",
  },
  {
    name: "Admin User",
    email: "admin@careloop.test",
    password: pw,
    role: "admin",
  },
]);
console.log("Seeded");
process.exit(0);
