// import { NextFunction, Request, Response } from 'express';
// import { ApiError } from '../errors/ApiErrors.js';
// import { NODE_ENV } from '../config/env.js';
// import logger from '../utils/logger.js';

// const errorHandler = (
//   err: unknown,
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   // Log error details
//   const logError = (error: unknown) => {
//     const errorDetails = {
//       path: req.path,
//       method: req.method,
//       query: req.query,
//       body: req.body,
//       headers: req.headers,
//       timestamp: new Date().toISOString(),
//     };

//     if (error instanceof ApiError) {
//       logger.error('API Error:', {
//         ...errorDetails,
//         errorName: error.name,
//         errorMessage: error.message,
//         errorCode: error.code,
//         errorStack: error.stack,
//         isOperational: error.isOperational,
//         details: error.details
//       });
//     } else if (error instanceof Error) {
//       logger.error('Unhandled Error:', {
//         ...errorDetails,
//         errorName: error.name,
//         errorMessage: error.message,
//         errorStack: error.stack
//       });
//     } else {
//       logger.error('Unknown Error:', {
//         ...errorDetails,
//         error
//       });
//     }
//   };

//   // Log the error
//   logError(err);

//   // Handle API Errors
//   if (err instanceof ApiError) {
//     const response = err.toJSON();
//     if (NODE_ENV === 'production') {
//       delete response.stack;
//       if (!err.isOperational) {
//         response.message = 'An unexpected error occurred';
//       }
//     }
//     return res.status(err.statusCode).json(response);
//   }

//   // Handle unknown errors
//   const genericError = {
//     status: 'error',
//     message: NODE_ENV === 'production' 
//       ? 'An unexpected error occurred' 
//       : err instanceof Error ? err.message : 'Unknown error',
//     code: 'INTERNAL_SERVER_ERROR',
//     timestamp: new Date().toISOString(),
//     ...(NODE_ENV === 'development' && err instanceof Error ? { stack: err.stack } : {})
//   };

//   return res.status(500).json(genericError);
// };

// export default errorHandler;