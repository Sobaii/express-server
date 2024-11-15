import { Request } from "express";
import { Session, User } from "@prisma/client";

interface AuthProvider {
  provider: string;
  providerId: string;
  accessToken: string;
  refreshToken: string;
}

interface SessionWithUser extends Session {
  user: User & {
    authProviders: AuthProvider[];
  };
}

export interface AuthenticatedRequest extends Request {
  session?: SessionWithUser;
}