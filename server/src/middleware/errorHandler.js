const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Converts every error into a consistent JSON shape:
 * { message: string, errors?: { field: message } }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || "Something went wrong on the server.";
  let errors = err.details;

  // Schema validation failed: report each field
  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = "Some fields are invalid.";
    errors = Object.fromEntries(Object.entries(err.errors).map(([field, e]) => [field, e.message]));
  }

  // Malformed id or wrong value type in the URL/body
  if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for ${err.path}.`;
  }

  // Unique index violation (e.g. an email that already exists)
  if (err.code === 11000) {
    status = 409;
    const fromMessage = /index: (\w+?)_1/.exec(err.message || "");
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || (fromMessage && fromMessage[1]);
    message = field ? `A record with this ${field} already exists.` : "A record with these details already exists.";
    if (field) errors = { [field]: message };
  }

  // Body is not valid JSON
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "The request body is not valid JSON.";
  }

  if (status >= 500 && process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  res.status(status).json({
    message: status >= 500 && process.env.NODE_ENV === "production" ? "Something went wrong on the server." : message,
    ...(errors ? { errors } : {}),
  });
}

module.exports = { notFound, errorHandler };
