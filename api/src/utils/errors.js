// Errors that carry an HTTP status. The error handler turns them into JSON responses.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class ValidationError extends HttpError {
  constructor(message) {
    super(400, message);
  }
}

class NotFoundError extends HttpError {
  constructor(message = 'Note not found') {
    super(404, message);
  }
}

module.exports = { HttpError, ValidationError, NotFoundError };
