// This file defines a set of custom API errors that should only be used in the API/controller layer

class ApiError extends Error {
  constructor(
    public name: string,
    public statusCode: number,
    public isOperational: boolean,
    public message: string,
    public isCustomError: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this);
  }
}

class InternalServerError extends ApiError {
  constructor(
    message = "Internal Server Error",
    isOperational: boolean = true,
  ) {
    super("Internal Server Error", 500, isOperational, message);
  }
}

class ValidationError extends ApiError {
  constructor(message = "Bad Request") {
    super("Bad Request", 400, true, message);
  }
}

class NotFoundError extends ApiError {
  constructor(message = "Not Found") {
    super("Not Found", 404, true, message);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super("Unauthorized", 401, true, message);
  }
}

export {
  ApiError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
};
