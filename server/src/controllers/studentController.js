const Student = require("../models/Student");
const ApiError = require("../utils/ApiError");

const { PROGRAMMES, STATUSES, GENDERS } = Student;

// Fields a client is allowed to set. studentId and timestamps are managed by the server.
const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "dateOfBirth",
  "gender",
  "programme",
  "year",
  "gpa",
  "status",
  "enrollmentDate",
  "city",
  "notes",
];

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { lastName: 1, firstName: 1 },
  "gpa-desc": { gpa: -1, lastName: 1 },
  "gpa-asc": { gpa: 1, lastName: 1 },
  year: { year: 1, lastName: 1 },
  id: { studentId: 1 },
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function pickEditable(body = {}) {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] === undefined) continue;
    // Empty strings from optional form fields mean "no value"
    data[field] = body[field] === "" ? null : body[field];
  }
  return data;
}

function buildFilter(query) {
  const filter = {};
  const { search, programme, year, status } = query;

  if (search && search.trim()) {
    // Every word must match at least one searchable field: "sara ben" finds Sara Ben Ali
    const words = search.trim().split(/\s+/).slice(0, 5);
    filter.$and = words.map((word) => {
      const regex = { $regex: escapeRegex(word), $options: "i" };
      return { $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { studentId: regex }, { city: regex }] };
    });
  }
  if (programme) {
    if (!PROGRAMMES.includes(programme)) throw ApiError.badRequest("Unknown programme filter.");
    filter.programme = programme;
  }
  if (year) {
    const value = Number(year);
    if (!Number.isInteger(value) || value < 1 || value > 5) throw ApiError.badRequest("Year filter must be 1 to 5.");
    filter.year = value;
  }
  if (status) {
    if (!STATUSES.includes(status)) throw ApiError.badRequest("Unknown status filter.");
    filter.status = status;
  }
  return filter;
}

/** GET /api/students — list with search, filters, sorting and pagination */
async function listStudents(req, res) {
  const filter = buildFilter(req.query);
  const sort = SORTS[req.query.sort] || SORTS.newest;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  const [items, total] = await Promise.all([
    Student.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Student.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    limit,
    total,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
}

/** GET /api/students/stats — numbers for the dashboard strip */
async function getStats(req, res) {
  const [total, active, graduated, gradedCount, gpaSum, perProgramme] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ status: "Active" }),
    Student.countDocuments({ status: "Graduated" }),
    Student.countDocuments({ gpa: { $ne: null } }),
    Student.aggregate([{ $match: { gpa: { $ne: null } } }, { $group: { _id: null, sum: { $sum: "$gpa" } } }]),
    Promise.all(PROGRAMMES.map(async (name) => ({ name, count: await Student.countDocuments({ programme: name }) }))),
  ]);

  const averageGpa = gradedCount ? Math.round((gpaSum[0].sum / gradedCount) * 100) / 100 : null;

  res.json({
    total,
    active,
    graduated,
    averageGpa,
    byProgramme: perProgramme.filter((p) => p.count > 0).sort((a, b) => b.count - a.count),
  });
}

/** GET /api/students/meta — option lists for forms and filters */
function getMeta(req, res) {
  res.json({ programmes: PROGRAMMES, statuses: STATUSES, genders: GENDERS, years: [1, 2, 3, 4, 5] });
}

// Friendly duplicate check; the unique index still guards against races
async function assertEmailFree(email, currentId) {
  if (!email) return;
  const existing = await Student.findOne({ email: String(email).trim().toLowerCase() }).select("_id");
  if (existing && existing.id !== currentId) {
    throw new ApiError(409, "A student with this email already exists.", {
      email: "A student with this email already exists.",
    });
  }
}

async function findStudentOr404(id) {
  const student = await Student.findById(id);
  if (!student) throw ApiError.notFound("No student found with this id.");
  return student;
}

/** GET /api/students/:id */
async function getStudent(req, res) {
  res.json(await findStudentOr404(req.params.id));
}

/** POST /api/students */
async function createStudent(req, res) {
  const data = pickEditable(req.body);
  await assertEmailFree(data.email);
  const student = new Student(data);
  await student.save();
  res.status(201).json(student);
}

/** PUT /api/students/:id */
async function updateStudent(req, res) {
  const student = await findStudentOr404(req.params.id);
  const data = pickEditable(req.body);
  await assertEmailFree(data.email, student.id);
  student.set(data);
  await student.save();
  res.json(student);
}

/** DELETE /api/students/:id */
async function deleteStudent(req, res) {
  const student = await findStudentOr404(req.params.id);
  await student.deleteOne();
  res.json({ message: `${student.fullName} was removed.`, id: student.id });
}

module.exports = {
  listStudents,
  getStats,
  getMeta,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
};
