/**
 * Thin wrapper around fetch for the Campus Registry API.
 * Throws an ApiError with the server's message and field errors on failure.
 */

export class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check that the API is running, then try again.", 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || `Request failed (${response.status}).`, response.status, data.errors);
  }
  return data;
}

const toQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const api = {
  listStudents: (params, signal) => request(`/students${toQuery(params)}`, { signal }),
  getStats: (signal) => request("/students/stats", { signal }),
  getMeta: () => request("/students/meta"),
  getStudent: (id, signal) => request(`/students/${id}`, { signal }),
  createStudent: (data) => request("/students", { method: "POST", body: data }),
  updateStudent: (id, data) => request(`/students/${id}`, { method: "PUT", body: data }),
  deleteStudent: (id) => request(`/students/${id}`, { method: "DELETE" }),
};
