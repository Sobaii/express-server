import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../interfaces/requestInterfaces.js";

const asyncHandler = (
  fn: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => Promise<any>,
) =>
(req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
