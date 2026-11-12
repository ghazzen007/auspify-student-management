import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useMeta } from "../hooks/useMeta.jsx";
import { useToast } from "../components/Toast.jsx";
import { ErrorNotice, Spinner, ordinalYear } from "../components/bits.jsx";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  city: "",
  programme: "",
  year: "",
  gpa: "",
  status: "Active",
  enrollmentDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

// Same rules as the server, checked before sending so mistakes show instantly
function validate(values) {
  const errors = {};
  if (values.firstName.trim().length < 2) errors.firstName = "First name must have at least 2 characters.";
  if (values.lastName.trim().length < 2) errors.lastName = "Last name must have at least 2 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (values.phone && !/^[+\d][\d\s-]{6,19}$/.test(values.phone.trim())) errors.phone = "Enter a valid phone number.";
  if (!values.programme) errors.programme = "Choose a programme.";
  if (!values.year) errors.year = "Choose the year of study.";
  if (values.gpa !== "" && (Number(values.gpa) < 0 || Number(values.gpa) > 4 || Number.isNaN(Number(values.gpa)))) {
    errors.gpa = "GPA must be between 0 and 4.";
  }
  if (values.notes.length > 500) errors.notes = "Notes must have at most 500 characters.";
  return errors;
}

function Field({ id, label, error, hint, children, wide }) {
  return (
    <div className={`field${error ? " has-error" : ""}${wide ? " field--wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

export default function StudentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const meta = useMeta();
  const toast = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    api
      .getStudent(id)
      .then((s) => {
        setStudentId(s.studentId);
        setValues({
          firstName: s.firstName || "",
          lastName: s.lastName || "",
          email: s.email || "",
          phone: s.phone || "",
          dateOfBirth: toInputDate(s.dateOfBirth),
          gender: s.gender || "",
          city: s.city || "",
          programme: s.programme || "",
          year: String(s.year || ""),
          gpa: s.gpa === null || s.gpa === undefined ? "" : String(s.gpa),
          status: s.status || "Active",
          enrollmentDate: toInputDate(s.enrollmentDate),
          notes: s.notes || "",
        });
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    const payload = {
      ...values,
      year: Number(values.year),
      gpa: values.gpa === "" ? "" : Number(values.gpa),
    };

    setSaving(true);
    try {
      const saved = isEdit ? await api.updateStudent(id, payload) : await api.createStudent(payload);
      toast(isEdit ? "Changes saved." : `${saved.fullName} was added as ${saved.studentId}.`);
      navigate(`/students/${saved.id}`);
    } catch (err) {
      if (err.errors && Object.keys(err.errors).length) {
        setErrors(err.errors);
        document.getElementById(Object.keys(err.errors)[0])?.focus();
      }
      toast(err.message, "error");
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Loading student" />;
  if (loadError) return <ErrorNotice message={loadError} />;

  const describedBy = (field) => (errors[field] ? `${field}-error` : undefined);

  return (
    <>
      <Link to={isEdit ? `/students/${id}` : "/"} className="back-link">
        {isEdit ? "Back to profile" : "All students"}
      </Link>
      <div className="page-head">
        <div>
          <h1>{isEdit ? `Edit ${values.firstName} ${values.lastName}` : "Add a student"}</h1>
          <p className="muted">
            {isEdit ? `Student ID ${studentId} stays the same.` : "A student ID is created automatically when you save."} Fields marked
            with * are required.
          </p>
        </div>
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <fieldset className="panel">
          <legend>Personal details</legend>
          <div className="grid">
            <Field id="firstName" label="First name *" error={errors.firstName}>
              <input id="firstName" value={values.firstName} onChange={set("firstName")} autoComplete="given-name" aria-invalid={Boolean(errors.firstName)} aria-describedby={describedBy("firstName")} />
            </Field>
            <Field id="lastName" label="Last name *" error={errors.lastName}>
              <input id="lastName" value={values.lastName} onChange={set("lastName")} autoComplete="family-name" aria-invalid={Boolean(errors.lastName)} aria-describedby={describedBy("lastName")} />
            </Field>
            <Field id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth}>
              <input id="dateOfBirth" type="date" value={values.dateOfBirth} onChange={set("dateOfBirth")} aria-describedby={describedBy("dateOfBirth")} />
            </Field>
            <Field id="gender" label="Gender" error={errors.gender}>
              <select id="gender" value={values.gender} onChange={set("gender")}>
                <option value="">Not specified</option>
                {meta.genders.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="panel">
          <legend>Contact</legend>
          <div className="grid">
            <Field id="email" label="Email *" error={errors.email}>
              <input id="email" type="email" value={values.email} onChange={set("email")} autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy("email")} />
            </Field>
            <Field id="phone" label="Phone" error={errors.phone} hint="Include the country code, e.g. +216 22 123 456">
              <input id="phone" type="tel" value={values.phone} onChange={set("phone")} autoComplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy("phone")} />
            </Field>
            <Field id="city" label="City" error={errors.city}>
              <input id="city" value={values.city} onChange={set("city")} autoComplete="address-level2" />
            </Field>
          </div>
        </fieldset>

        <fieldset className="panel">
          <legend>Academic record</legend>
          <div className="grid">
            <Field id="programme" label="Programme *" error={errors.programme}>
              <select id="programme" value={values.programme} onChange={set("programme")} aria-invalid={Boolean(errors.programme)} aria-describedby={describedBy("programme")}>
                <option value="">Choose a programme</option>
                {meta.programmes.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field id="year" label="Year of study *" error={errors.year}>
              <select id="year" value={values.year} onChange={set("year")} aria-invalid={Boolean(errors.year)} aria-describedby={describedBy("year")}>
                <option value="">Choose a year</option>
                {meta.years.map((y) => (
                  <option key={y} value={y}>
                    {ordinalYear(y)} year
                  </option>
                ))}
              </select>
            </Field>
            <Field id="gpa" label="GPA (out of 4)" error={errors.gpa} hint="Leave empty if no grades yet">
              <input id="gpa" type="number" inputMode="decimal" step="0.01" min="0" max="4" value={values.gpa} onChange={set("gpa")} aria-invalid={Boolean(errors.gpa)} aria-describedby={describedBy("gpa")} />
            </Field>
            <Field id="status" label="Status" error={errors.status}>
              <select id="status" value={values.status} onChange={set("status")}>
                {meta.statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field id="enrollmentDate" label="Enrolment date" error={errors.enrollmentDate}>
              <input id="enrollmentDate" type="date" value={values.enrollmentDate} onChange={set("enrollmentDate")} />
            </Field>
            <Field id="notes" label="Notes" error={errors.notes} hint={`${values.notes.length}/500 characters`} wide>
              <textarea id="notes" rows="3" value={values.notes} onChange={set("notes")} aria-describedby={describedBy("notes")} />
            </Field>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add student"}
          </button>
          <Link to={isEdit ? `/students/${id}` : "/"} className="btn btn--ghost">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
