import { NextFunction, Request, Response, RequestHandler } from "express";
import {
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/ApiErrors.js";
import cookies from "../utils/cookies.js";
import prisma from "../prisma/index.js";

const ensureAuthenticated: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log("User's cookies:", req.cookies);
    const sessionId = cookies.get(req, "sessionId");
    if (!sessionId) {
      next(new UnauthorizedError("Unauthorized"));
      return;
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
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    if (!session.user) {
      next(new NotFoundError("User not found"));
      return;
    }
    
    req.session = session;
    next();
  } catch (error) {
    next(new InternalServerError("An unexpected error occurred"));
  }
};

export { ensureAuthenticated };