const mongoose = require("mongoose");
const Counter = require("./Counter");

const PROGRAMMES = [
  "Business Computing",
  "Computer Science",
  "Data Science",
  "Software Engineering",
  "Finance",
  "Marketing",
];

const STATUSES = ["Active", "On leave", "Suspended", "Graduated"];
const GENDERS = ["Female", "Male", "Prefer not to say"];

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required."],
      trim: true,
      minlength: [2, "First name must have at least 2 characters."],
      maxlength: [50, "First name must have at most 50 characters."],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required."],
      trim: true,
      minlength: [2, "Last name must have at least 2 characters."],
      maxlength: [50, "Last name must have at most 50 characters."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address."],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+\d][\d\s-]{6,19}$/, "Enter a valid phone number."],
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator(value) {
          if (!value) return true;
          const age = (Date.now() - value.getTime()) / (365.25 * 24 * 3600 * 1000);
          return age >= 15 && age <= 80;
        },
        message: "Date of birth must give an age between 15 and 80.",
      },
    },
    gender: {
      type: String,
      enum: { values: GENDERS, message: "Choose a valid gender option." },
    },
    programme: {
      type: String,
      required: [true, "Programme is required."],
      enum: { values: PROGRAMMES, message: "Choose a programme from the list." },
    },
    year: {
      type: Number,
      required: [true, "Year of study is required."],
      min: [1, "Year of study must be between 1 and 5."],
      max: [5, "Year of study must be between 1 and 5."],
    },
    gpa: {
      type: Number,
      min: [0, "GPA must be between 0 and 4."],
      max: [4, "GPA must be between 0 and 4."],
      default: null,
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: "Choose a valid status." },
      default: "Active",
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    city: {
      type: String,
      trim: true,
      maxlength: [60, "City must have at most 60 characters."],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes must have at most 500 characters."],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

studentSchema.virtual("fullName").get(function fullName() {
  return `${this.firstName} ${this.lastName}`;
});

// Give every new student a readable, unique ID: STU-<enrolment year>-<sequence>
studentSchema.pre("save", async function assignStudentId() {
  if (this.studentId) return;
  const year = (this.enrollmentDate || new Date()).getFullYear();
  const seq = await Counter.next(`student-${year}`);
  this.studentId = `STU-${year}-${String(seq).padStart(4, "0")}`;
});

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
module.exports.PROGRAMMES = PROGRAMMES;
module.exports.STATUSES = STATUSES;
module.exports.GENDERS = GENDERS;
