var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { InternalServerError, NotFoundError, UnauthorizedError, } from "../errors/ApiErrors.js";
import cookies from "../utils/cookies.js";
import prisma from "../prisma/index.js";
const ensureAuthenticated = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sessionId = cookies.get(req, "sessionId");
        if (!sessionId) {
            next(new UnauthorizedError("Unauthorized"));
            return;
        }
        const session = yield prisma.session.findUnique({
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
    }
    catch (error) {
        next(new InternalServerError("An unexpected error occurred"));
    }
});
export { ensureAuthenticated };
