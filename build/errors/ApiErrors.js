export class ApiError extends Error {
    constructor(name, statusCode, isOperational, message, code, details) {
        super(message);
        this.name = name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            status: 'error',
            message: this.message,
            code: this.code,
            timestamp: new Date().toISOString(),
            stack: this.stack,
            details: this.details
        };
    }
}
export class InternalServerError extends ApiError {
    constructor(message = 'An unexpected error occurred', details) {
        super('Internal Server Error', 500, false, message, 'INTERNAL_SERVER_ERROR', details);
    }
}
export class ValidationError extends ApiError {
    constructor(message = 'Invalid input data', details) {
        super('Validation Error', 400, true, message, 'VALIDATION_ERROR', details);
    }
}
export class NotFoundError extends ApiError {
    constructor(message = 'Resource not found', details) {
        super('Not Found', 404, true, message, 'NOT_FOUND', details);
    }
}
export class UnauthorizedError extends ApiError {
    constructor(message = 'Authentication required', details) {
        super('Unauthorized', 401, true, message, 'UNAUTHORIZED', details);
    }
}
