/**
 * Fills the database with realistic demo students.
 * Usage: npm run seed   (replaces every student with the demo set)
 */
require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const Student = require("../src/models/Student");
const Counter = require("../src/models/Counter");

const people = [
  ["Sara", "Ben Ali", "Female", "Tunis"],
  ["Youssef", "Trabelsi", "Male", "Sfax"],
  ["Amira", "Haddad", "Female", "Sousse"],
  ["Omar", "Gharbi", "Male", "Ariana"],
  ["Lina", "Mansour", "Female", "Nabeul"],
  ["Karim", "Jaziri", "Male", "Bizerte"],
  ["Nour", "Chaabane", "Female", "Monastir"],
  ["Mehdi", "Ayari", "Male", "Tunis"],
  ["Ines", "Hammami", "Female", "La Marsa"],
  ["Aziz", "Khelifi", "Male", "Gabès"],
  ["Maya", "Bouazizi", "Female", "Kairouan"],
  ["Rami", "Saidi", "Male", "Ben Arous"],
  ["Emma", "Laurent", "Female", "Lyon"],
  ["Lucas", "Moreau", "Male", "Paris"],
  ["Priya", "Sharma", "Female", "Pune"],
  ["Arjun", "Mehta", "Male", "Bengaluru"],
  ["Fatma", "Zouari", "Female", "Sfax"],
  ["Hamza", "Dridi", "Male", "Béja"],
  ["Rania", "Messaoudi", "Female", "Tunis"],
  ["Skander", "Belhadj", "Male", "Hammamet"],
  ["Yasmine", "Ferchichi", "Female", "Ariana"],
  ["Adam", "Rekik", "Male", "Mahdia"],
  ["Salma", "Kammoun", "Female", "Sfax"],
  ["Elyes", "Mejri", "Male", "Jendouba"],
  ["Chiara", "Romano", "Female", "Milan"],
  ["Daniel", "Okafor", "Male", "Lagos"],
  ["Hiba", "Toumi", "Female", "Sousse"],
  ["Bilel", "Jemli", "Male", "Kef"],
  ["Molka", "Sassi", "Female", "Tunis"],
  ["Firas", "Baccouche", "Male", "Monastir"],
  ["Aya", "Rezgui", "Female", "Nabeul"],
  ["Wassim", "Hamdi", "Male", "Ariana"],
];

const programmes = Student.PROGRAMMES;

// Small deterministic random generator so the demo data is the same every time
let state = 42;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length)];

function buildStudents() {
  return people.map(([firstName, lastName, gender, city], index) => {
    const year = 1 + Math.floor(rand() * 5);
    const enrollmentYear = 2026 - year + 1;
    const age = 17 + year + Math.floor(rand() * 3);
    let status = "Active";
    if (index % 11 === 3) status = "On leave";
    if (index % 13 === 5) status = "Suspended";
    if (year === 5 && index % 2 === 0) status = "Graduated";
    const emailName = `${firstName}.${lastName}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");

    return {
      firstName,
      lastName,
      gender,
      city,
      email: `${emailName}@campus.edu`,
      phone: `+216 ${20 + Math.floor(rand() * 79)} ${String(Math.floor(rand() * 1000)).padStart(3, "0")} ${String(Math.floor(rand() * 1000)).padStart(3, "0")}`,
      dateOfBirth: new Date(Date.UTC(2026 - age, Math.floor(rand() * 12), 1 + Math.floor(rand() * 27))),
      programme: index < 6 ? programmes[index] : pick(programmes),
      year,
      gpa: index % 9 === 8 ? null : Math.round((2 + rand() * 2) * 100) / 100,
      status,
      enrollmentDate: new Date(Date.UTC(enrollmentYear, 8, 15)),
      notes: index % 4 === 0 ? "Member of the student council." : index % 5 === 0 ? "Scholarship holder." : undefined,
    };
  });
}

async function seed() {
  await connectDB();
  await Student.deleteMany({});
  await Counter.deleteMany({});
  await Student.syncIndexes();

  // Save one by one so each student gets an ID in enrolment order
  const students = buildStudents().sort((a, b) => a.enrollmentDate - b.enrollmentDate);
  for (const data of students) {
    await new Student(data).save();
  }

  console.log(`Seeded ${students.length} students.`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Seeding failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
