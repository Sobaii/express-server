import { NextFunction, Request, Response } from "express";
import { ApiError } from "../errors/ApiErrors.js";
import { NODE_ENV } from "../config/env.js";

const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  if (err instanceof Error) {
    if (NODE_ENV === "development") {
      console.log(err.stack);  
    } else {
      console.log(err.message);  
    }
  }

  if (typeof err === "object" && err !== null && "isCustomError" in err) {
    const typedError = err as ApiError;
    res.status(typedError.statusCode).json({
      status: "error",
      message: typedError.message,
      isOperational: typedError.isOperational,
    });
  } else {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

export default errorHandler;
