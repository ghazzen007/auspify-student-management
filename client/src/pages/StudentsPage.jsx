import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useMeta } from "../hooks/useMeta.jsx";
import useDebounce from "../hooks/useDebounce.js";
import { useToast } from "../components/Toast.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { Avatar, ErrorNotice, Spinner, StatusPill, formatGpa, ordinalYear } from "../components/bits.jsx";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "name", label: "Last name A–Z" },
  { value: "id", label: "Student ID" },
  { value: "gpa-desc", label: "Highest GPA" },
  { value: "gpa-asc", label: "Lowest GPA" },
  { value: "year", label: "Year of study" },
];

const PAGE_SIZE = 10;

export default function StudentsPage() {
  const meta = useMeta();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // Filters live in the URL so a filtered list can be bookmarked or shared
  const filters = {
    search: params.get("search") || "",
    programme: params.get("programme") || "",
    year: params.get("year") || "",
    status: params.get("status") || "",
    sort: params.get("sort") || "newest",
    page: Number(params.get("page")) || 1,
  };

  const [searchText, setSearchText] = useState(filters.search);
  const debouncedSearch = useDebounce(searchText, 300);

  const [list, setList] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Always build on the latest URL (not a stale copy), so quick successive changes don't undo each other
  const updateFilters = useCallback(
    (changes) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === "" || value === null || (key === "sort" && value === "newest") || (key === "page" && value === 1)) {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          });
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  // Push the debounced search text into the URL (and go back to page 1)
  useEffect(() => {
    setParams(
      (prev) => {
        const value = debouncedSearch.trim();
        if ((prev.get("search") || "") === value) return prev;
        const next = new URLSearchParams(prev);
        if (value) next.set("search", value);
        else next.delete("search");
        next.delete("page");
        return next;
      },
      { replace: true }
    );
  }, [debouncedSearch, setParams]);

  const queryKey = params.toString();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      api.listStudents({ ...filters, limit: PAGE_SIZE }, controller.signal),
      api.getStats(controller.signal),
    ])
      .then(([listData, statsData]) => {
        setList(listData);
        setStats(statsData);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, reloadKey]);

  const hasFilters = Boolean(filters.search || filters.programme || filters.year || filters.status);

  const clearFilters = () => {
    setSearchText("");
    setParams(filters.sort !== "newest" ? { sort: filters.sort } : {}, { replace: true });
  };

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.deleteStudent(toDelete.id);
      toast(`${toDelete.fullName} was removed.`);
      setToDelete(null);
      // Step back a page if we just emptied the last one
      if (list.items.length === 1 && filters.page > 1) updateFilters({ page: filters.page - 1 });
      else setReloadKey((k) => k + 1);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Students</h1>
          <p className="muted">Search, filter and manage every student record in one place.</p>
        </div>
        <Link to="/students/new" className="btn btn--primary">
          Add student
        </Link>
      </div>

      <section className="stats" aria-label="Summary">
        <div className="stat">
          <span className="stat-value">{stats ? stats.total : "–"}</span>
          <span className="stat-label">Students on record</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats ? stats.active : "–"}</span>
          <span className="stat-label">Currently active</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats ? stats.graduated : "–"}</span>
          <span className="stat-label">Graduated</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats ? formatGpa(stats.averageGpa) : "–"}</span>
          <span className="stat-label">Average GPA (out of 4)</span>
        </div>
        {stats && stats.byProgramme.length > 0 && (
          <div className="stat stat--wide">
            <span className="stat-label">Students per programme</span>
            <ul className="programme-bars">
              {stats.byProgramme.map((p) => (
                <li key={p.name}>
                  <button
                    type="button"
                    className={`programme-bar${filters.programme === p.name ? " is-active" : ""}`}
                    onClick={() => updateFilters({ programme: filters.programme === p.name ? "" : p.name, page: 1 })}
                    aria-pressed={filters.programme === p.name}
                    title={`Show only ${p.name}`}
                  >
                    <span className="programme-name">{p.name}</span>
                    <span className="programme-track">
                      <span style={{ width: `${(p.count / stats.byProgramme[0].count) * 100}%` }} />
                    </span>
                    <span className="programme-count">{p.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="toolbar" aria-label="Search and filters">
        <div className="field field--search">
          <label htmlFor="search" className="sr-only">
            Search students
          </label>
          <input
            id="search"
            type="search"
            placeholder="Search by name, email, ID or city"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f-programme" className="sr-only">
            Programme
          </label>
          <select id="f-programme" value={filters.programme} onChange={(e) => updateFilters({ programme: e.target.value, page: 1 })}>
            <option value="">All programmes</option>
            {meta.programmes.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-year" className="sr-only">
            Year
          </label>
          <select id="f-year" value={filters.year} onChange={(e) => updateFilters({ year: e.target.value, page: 1 })}>
            <option value="">All years</option>
            {meta.years.map((y) => (
              <option key={y} value={y}>
                {ordinalYear(y)} year
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-status" className="sr-only">
            Status
          </label>
          <select id="f-status" value={filters.status} onChange={(e) => updateFilters({ status: e.target.value, page: 1 })}>
            <option value="">All statuses</option>
            {meta.statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-sort" className="sr-only">
            Sort by
          </label>
          <select id="f-sort" value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value, page: 1 })}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button type="button" className="btn btn--link" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </section>

      {error && <ErrorNotice message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {!error && !list && loading && <Spinner label="Loading students" />}

      {!error && list && (
        <section aria-label="Student list" aria-busy={loading}>
          <p className="result-count" aria-live="polite">
            {list.total === 0 ? "No students match." : `Showing ${(list.page - 1) * list.limit + 1}–${Math.min(list.page * list.limit, list.total)} of ${list.total} students`}
          </p>

          {list.total === 0 ? (
            <div className="empty">
              {hasFilters ? (
                <>
                  <h2>No students match these filters</h2>
                  <p className="muted">Try another spelling, or clear the filters to see everyone.</p>
                  <button type="button" className="btn btn--ghost" onClick={clearFilters}>
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <h2>No students yet</h2>
                  <p className="muted">Add the first student record to get started.</p>
                  <Link to="/students/new" className="btn btn--primary">
                    Add student
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className={`table-wrap${loading ? " is-loading" : ""}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Student ID</th>
                    <th scope="col">Programme</th>
                    <th scope="col">Year</th>
                    <th scope="col" className="num">
                      GPA
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((s) => (
                    <tr key={s.id} onClick={(e) => !e.target.closest("a, button") && navigate(`/students/${s.id}`)}>
                      <td data-label="Student">
                        <div className="person">
                          <Avatar student={s} />
                          <div>
                            <Link to={`/students/${s.id}`} className="person-name">
                              {s.fullName}
                            </Link>
                            <span className="person-email">{s.email}</span>
                          </div>
                        </div>
                      </td>
                      <td data-label="ID" className="mono">
                        {s.studentId}
                      </td>
                      <td data-label="Programme">{s.programme}</td>
                      <td data-label="Year">{ordinalYear(s.year)}</td>
                      <td data-label="GPA" className="num">
                        {formatGpa(s.gpa)}
                      </td>
                      <td data-label="Status">
                        <StatusPill status={s.status} />
                      </td>
                      <td className="row-actions">
                        <Link to={`/students/${s.id}/edit`} className="icon-btn" aria-label={`Edit ${s.fullName}`} title="Edit">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
                            <path d="m13.5 6.5 4 4" />
                          </svg>
                        </Link>
                        <button type="button" className="icon-btn icon-btn--danger" aria-label={`Remove ${s.fullName}`} title="Remove" onClick={() => setToDelete(s)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {list.pages > 1 && (
            <nav className="pagination" aria-label="Pages">
              <button type="button" className="btn btn--ghost" disabled={list.page <= 1} onClick={() => updateFilters({ page: list.page - 1 })}>
                Previous
              </button>
              <span>
                Page {list.page} of {list.pages}
              </span>
              <button type="button" className="btn btn--ghost" disabled={list.page >= list.pages} onClick={() => updateFilters({ page: list.page + 1 })}>
                Next
              </button>
            </nav>
          )}
        </section>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete ? `Remove ${toDelete.fullName}?` : ""}
        confirmLabel="Remove student"
        cancelLabel="Keep record"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          This permanently deletes the record for <strong>{toDelete?.studentId}</strong>. It can't be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
