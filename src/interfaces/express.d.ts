import { Session, User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      session: Session & {
        user: User & {
          authProviders: {
            provider: string;
            providerId: string;
            accessToken: string;
            refreshToken: string;
          }[];
        };
      };
    }
  }
}