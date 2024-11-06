import { Request } from "express";
import { Session } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  session?: Session
}
