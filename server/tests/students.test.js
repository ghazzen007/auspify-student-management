const request = require("supertest");
const app = require("../src/app");
const Student = require("../src/models/Student");
const db = require("./helpers/db");

const validStudent = (overrides = {}) => ({
  firstName: "Sara",
  lastName: "Ben Ali",
  email: "sara.benali@campus.edu",
  phone: "+216 22 123 456",
  programme: "Business Computing",
  year: 3,
  gpa: 3.42,
  city: "Tunis",
  ...overrides,
});

beforeAll(db.connect);
beforeEach(async () => {
  await db.clear();
  await Student.syncIndexes();
});
afterAll(db.close);

describe("Health", () => {
  it("reports the API and database status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "connected" });
  });
});

describe("Create students (POST /api/students)", () => {
  it("creates a student and assigns a readable student ID", async () => {
    const res = await request(app).post("/api/students").send(validStudent());
    expect(res.status).toBe(201);
    expect(res.body.studentId).toMatch(/^STU-\d{4}-0001$/);
    expect(res.body.fullName).toBe("Sara Ben Ali");
    expect(res.body.status).toBe("Active");
  });

  it("gives consecutive IDs to consecutive students", async () => {
    const a = await request(app).post("/api/students").send(validStudent());
    const b = await request(app).post("/api/students").send(validStudent({ email: "omar@campus.edu", firstName: "Omar" }));
    expect(Number(a.body.studentId.slice(-4)) + 1).toBe(Number(b.body.studentId.slice(-4)));
  });

  it("rejects missing required fields with a message per field", async () => {
    const res = await request(app).post("/api/students").send({ firstName: "S" });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty("lastName");
    expect(res.body.errors).toHaveProperty("email");
    expect(res.body.errors).toHaveProperty("programme");
    expect(res.body.errors).toHaveProperty("year");
    expect(res.body.errors.firstName).toMatch(/at least 2/);
  });

  it("rejects an invalid email, GPA and year", async () => {
    const res = await request(app)
      .post("/api/students")
      .send(validStudent({ email: "not-an-email", gpa: 5.2, year: 9 }));
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors).sort()).toEqual(["email", "gpa", "year"]);
  });

  it("refuses a duplicate email with 409", async () => {
    await request(app).post("/api/students").send(validStudent());
    const res = await request(app).post("/api/students").send(validStudent({ email: "SARA.BENALI@campus.edu" }));
    expect(res.status).toBe(409);
    expect(res.body.errors).toHaveProperty("email");
  });

  it("ignores fields the client is not allowed to set", async () => {
    const res = await request(app).post("/api/students").send(validStudent({ studentId: "HACKED-1" }));
    expect(res.status).toBe(201);
    expect(res.body.studentId).not.toBe("HACKED-1");
  });
});

describe("Read students (GET /api/students)", () => {
  beforeEach(async () => {
    const rows = [
      validStudent({ firstName: "Sara", lastName: "Ben Ali", email: "s@campus.edu", programme: "Finance", year: 1, gpa: 3.9 }),
      validStudent({ firstName: "Omar", lastName: "Gharbi", email: "o@campus.edu", programme: "Data Science", year: 2, gpa: 2.5 }),
      validStudent({ firstName: "Lina", lastName: "Mansour", email: "l@campus.edu", programme: "Finance", year: 2, gpa: 3.1, status: "Graduated" }),
    ];
    for (const row of rows) await request(app).post("/api/students").send(row);
  });

  it("lists students with pagination info", async () => {
    const res = await request(app).get("/api/students?limit=2&page=1");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body).toMatchObject({ total: 3, pages: 2, page: 1, limit: 2 });
  });

  it("searches by full name across fields", async () => {
    const res = await request(app).get("/api/students").query({ search: "sara ben" });
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].firstName).toBe("Sara");
  });

  it("treats search text literally, not as a regular expression", async () => {
    const res = await request(app).get("/api/students").query({ search: ".*" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it("filters by programme, year and status together", async () => {
    const res = await request(app).get("/api/students").query({ programme: "Finance", year: 2, status: "Graduated" });
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].firstName).toBe("Lina");
  });

  it("sorts by GPA", async () => {
    const res = await request(app).get("/api/students").query({ sort: "gpa-desc" });
    expect(res.body.items.map((s) => s.gpa)).toEqual([3.9, 3.1, 2.5]);
  });

  it("rejects unknown filter values", async () => {
    const res = await request(app).get("/api/students").query({ programme: "Astrology" });
    expect(res.status).toBe(400);
  });

  it("returns dashboard statistics", async () => {
    const res = await request(app).get("/api/students/stats");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 3, active: 2, graduated: 1, averageGpa: 3.17 });
    expect(res.body.byProgramme[0]).toEqual({ name: "Finance", count: 2 });
  });

  it("returns one student by id, and 404 or 400 for bad ids", async () => {
    const list = await request(app).get("/api/students");
    const id = list.body.items[0].id;
    const found = await request(app).get(`/api/students/${id}`);
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(id);

    const missing = await request(app).get("/api/students/64b7f0c2a1b2c3d4e5f60718");
    expect(missing.status).toBe(404);

    const invalid = await request(app).get("/api/students/not-an-id");
    expect(invalid.status).toBe(400);
  });
});

describe("Update and delete", () => {
  let student;

  beforeEach(async () => {
    const res = await request(app).post("/api/students").send(validStudent());
    student = res.body;
  });

  it("updates a student and keeps the student ID", async () => {
    const res = await request(app)
      .put(`/api/students/${student.id}`)
      .send({ year: 4, status: "On leave", city: "Sousse", studentId: "CHANGED" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ year: 4, status: "On leave", city: "Sousse", studentId: student.studentId });
  });

  it("validates updates too", async () => {
    const res = await request(app).put(`/api/students/${student.id}`).send({ gpa: -1 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty("gpa");
  });

  it("clears optional fields sent as empty strings", async () => {
    const res = await request(app).put(`/api/students/${student.id}`).send({ phone: "", city: "" });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBeNull();
    expect(res.body.city).toBeNull();
  });

  it("deletes a student", async () => {
    const res = await request(app).delete(`/api/students/${student.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Sara Ben Ali was removed/);
    const after = await request(app).get(`/api/students/${student.id}`);
    expect(after.status).toBe(404);
  });
});

describe("Errors", () => {
  it("returns JSON 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/nothing-here");
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Route not found/);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request(app).post("/api/students").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
  });
});
