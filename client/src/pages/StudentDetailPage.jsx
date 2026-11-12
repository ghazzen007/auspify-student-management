import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { Avatar, ErrorNotice, Spinner, StatusPill, ageFrom, formatDate, formatGpa, ordinalYear } from "../components/bits.jsx";

/** Barcode-style stripes generated from the student ID, purely decorative */
function IdBarcode({ value }) {
  const bars = [...value].flatMap((char, i) => {
    const code = char.charCodeAt(0) + i;
    return [1 + (code % 3), 1 + ((code >> 1) % 2), 1 + ((code >> 3) % 3), 1];
  });
  let x = 0;
  return (
    <svg className="barcode" viewBox={`0 0 ${bars.reduce((a, b) => a + b + 1, 0)} 30`} preserveAspectRatio="none" aria-hidden="true">
      {bars.map((width, i) => {
        const rect = i % 2 === 0 ? <rect key={i} x={x} y="0" width={width} height="30" /> : null;
        x += width + 1;
        return rect;
      })}
    </svg>
  );
}

function Detail({ label, children }) {
  return (
    <div className="detail">
      <dt>{label}</dt>
      <dd>{children || <span className="muted">Not provided</span>}</dd>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getStudent(id, controller.signal)
      .then(setStudent)
      .catch((err) => err.name !== "AbortError" && setError(err));
    return () => controller.abort();
  }, [id]);

  async function remove() {
    setDeleting(true);
    try {
      await api.deleteStudent(id);
      toast(`${student.fullName} was removed.`);
      navigate("/", { replace: true });
    } catch (err) {
      toast(err.message, "error");
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <>
        <Link to="/" className="back-link">
          All students
        </Link>
        {error.status === 404 || error.status === 400 ? (
          <div className="empty">
            <h1>Student not found</h1>
            <p className="muted">This record may have been removed. Go back to the list to find the right student.</p>
            <Link to="/" className="btn btn--primary">
              Back to students
            </Link>
          </div>
        ) : (
          <ErrorNotice message={error.message} onRetry={() => window.location.reload()} />
        )}
      </>
    );
  }

  if (!student) return <Spinner label="Loading student" />;

  const age = ageFrom(student.dateOfBirth);

  return (
    <>
      <Link to="/" className="back-link">
        All students
      </Link>

      <div className="profile">
        <aside>
          <article className="id-card" aria-label={`Student card for ${student.fullName}`}>
            <div className="id-card-band">
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <path d="M32 14 52 24 32 34 12 24Z" fill="#fff" />
                <path d="M20 29v10c0 4 6 7 12 7s12-3 12-7V29l-12 6Z" fill="#d99a3d" />
              </svg>
              <span>Campus Registry</span>
              <span className="id-card-kind">Student card</span>
            </div>
            <div className="id-card-body">
              <Avatar student={student} size="xl" />
              <div>
                <h1 className="id-card-name">{student.fullName}</h1>
                <p className="id-card-programme">
                  {student.programme}, {ordinalYear(student.year)} year
                </p>
                <StatusPill status={student.status} />
              </div>
            </div>
            <div className="id-card-foot">
              <div>
                <span className="id-card-label">Student ID</span>
                <span className="id-card-id">{student.studentId}</span>
              </div>
              <div>
                <span className="id-card-label">Enrolled</span>
                <span className="id-card-id">{formatDate(student.enrollmentDate, { month: "short", year: "numeric" })}</span>
              </div>
            </div>
            <IdBarcode value={student.studentId} />
          </article>

          <div className="profile-actions">
            <Link to={`/students/${student.id}/edit`} className="btn btn--primary">
              Edit student
            </Link>
            <button type="button" className="btn btn--ghost-danger" onClick={() => setConfirming(true)}>
              Remove student
            </button>
          </div>
        </aside>

        <div className="profile-details">
          <section className="panel">
            <h2>Academic record</h2>
            <dl className="details">
              <Detail label="Programme">{student.programme}</Detail>
              <Detail label="Year of study">{ordinalYear(student.year)} year</Detail>
              <Detail label="GPA (out of 4)">{student.gpa !== null && student.gpa !== undefined ? formatGpa(student.gpa) : null}</Detail>
              <Detail label="Status">{student.status}</Detail>
              <Detail label="Enrolled on">{formatDate(student.enrollmentDate)}</Detail>
            </dl>
          </section>

          <section className="panel">
            <h2>Contact</h2>
            <dl className="details">
              <Detail label="Email">
                <a href={`mailto:${student.email}`}>{student.email}</a>
              </Detail>
              <Detail label="Phone">{student.phone && <a href={`tel:${student.phone.replace(/\s/g, "")}`}>{student.phone}</a>}</Detail>
              <Detail label="City">{student.city}</Detail>
            </dl>
          </section>

          <section className="panel">
            <h2>Personal details</h2>
            <dl className="details">
              <Detail label="Date of birth">{student.dateOfBirth && `${formatDate(student.dateOfBirth)} (${age} years old)`}</Detail>
              <Detail label="Gender">{student.gender}</Detail>
            </dl>
          </section>

          <section className="panel">
            <h2>Notes</h2>
            {student.notes ? <p className="notes">{student.notes}</p> : <p className="muted">No notes for this student.</p>}
          </section>

          <p className="record-meta">
            Record created {formatDate(student.createdAt)}, last updated {formatDate(student.updatedAt)}.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Remove ${student.fullName}?`}
        confirmLabel="Remove student"
        cancelLabel="Keep record"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      >
        <p>
          This permanently deletes the record for <strong>{student.studentId}</strong>. It can't be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
