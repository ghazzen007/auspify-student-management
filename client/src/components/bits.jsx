/* Small presentational pieces shared by several pages */

const STATUS_CLASS = {
  Active: "pill--active",
  "On leave": "pill--leave",
  Suspended: "pill--suspended",
  Graduated: "pill--graduated",
};

export function StatusPill({ status }) {
  return <span className={`pill ${STATUS_CLASS[status] || ""}`}>{status}</span>;
}

// Stable colour per student, picked from a small calm palette
const AVATAR_COLORS = ["#2f5d50", "#3b5ba5", "#8a5a2b", "#6b4c9a", "#2b6f86", "#9a3f5c"];

export function Avatar({ student, size = "md" }) {
  const initials = `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`.toUpperCase();
  const seed = [...(student.studentId || student.email || initials)].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return (
    <span className={`avatar avatar--${size}`} style={{ background: AVATAR_COLORS[seed % AVATAR_COLORS.length] }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorNotice({ message, onRetry }) {
  return (
    <div className="notice notice--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export const formatDate = (value, options = { day: "numeric", month: "short", year: "numeric" }) =>
  value ? new Date(value).toLocaleDateString("en-GB", options) : "—";

export const formatGpa = (gpa) => (gpa === null || gpa === undefined ? "—" : Number(gpa).toFixed(2));

export function ageFrom(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday = now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export const ordinalYear = (year) => ["", "1st", "2nd", "3rd", "4th", "5th"][year] || `${year}th`;
