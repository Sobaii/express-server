import { getUserGoogleInfo, handleGoogleCallback, handleGoogleLogin, refreshAccessToken, } from "../controllers/oAuthControllers.js";
import { Router } from "express";
import { ensureAuthenticated } from "../middleware/authMiddleware.js";
const router = Router();
router.post("/google", handleGoogleLogin);
router.get("/google/callback", handleGoogleCallback);
router.get("/google/getUserInfo", ensureAuthenticated, getUserGoogleInfo);
router.get("/refresh-access-token", ensureAuthenticated, refreshAccessToken);
export { router as oAuthRoutes };
