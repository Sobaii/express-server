import { NextFunction, Response } from "express";
import {
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/ApiErrors.js";
import cookies from "../cookies.js";
import { AuthenticatedRequest } from "../interfaces/requestInterfaces.js";
import prisma from "../prisma/index.js";

const ensureAuthenticated = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionId = cookies.get(req, "sessionId");
    if (!sessionId) {
      return next(new UnauthorizedError("Unauthorized"));
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            authProviders: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }

    if (!session.user) {
      return next(new NotFoundError("User not found"));
    }
    req.session = session;

    next();
  } catch (error) {
    return next(new InternalServerError("An unexpected error occurred"));
  }
};

export { ensureAuthenticated };
