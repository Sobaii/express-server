var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcrypt";
import { FRONTEND_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SERVER_URL, } from "../config/env.js";
import { InternalServerError } from "../errors/ApiErrors.js";
import cookies from "../utils/cookies.js";
import prisma from "../prisma/index.js";
import { add } from "date-fns";
import { createRandomString } from "../utils/createRandomString.js";
const googleOAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${SERVER_URL}/auth/google/callback`);
// Function to initiate Google login
const handleGoogleLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const origin = req.headers.origin;
    if (origin === FRONTEND_URL) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Referrer-Policy", "no-referrer-when-downgrade");
    }
    const authorizeUrl = googleOAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "openid",
        ],
        prompt: "consent",
    });
    res.status(200).json({ url: authorizeUrl });
});
const getUserGoogleInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const googleAuthProvider = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user.authProviders.find((provider) => provider.provider === "google");
    if (!googleAuthProvider) {
        throw new InternalServerError("Google auth provider not found");
    }
    const response = yield fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${googleAuthProvider.accessToken}`);
    if (!response.ok) {
        throw new InternalServerError("Failed to fetch user info from Google");
    }
    const userData = yield response.json();
    res.status(200).json(userData);
});
// Function to handle the Google OAuth2 callback
const handleGoogleCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const code = req.query.code;
        if (!code || typeof code !== "string") {
            return res.redirect(`${FRONTEND_URL}/signup`);
        }
        const { tokens } = yield googleOAuth2Client.getToken(code);
        const { id_token: idToken, access_token: accessToken, refresh_token: refreshToken, } = tokens;
        if (!idToken) {
            throw new InternalServerError("ID token is missing");
        }
        if (!accessToken) {
            throw new InternalServerError("Access token not generated");
        }
        if (!refreshToken) {
            throw new InternalServerError("Refresh token not generated");
        }
        // Verify the ID token
        const ticket = yield googleOAuth2Client.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new InternalServerError("Invalid ID token");
        }
        // Upsert user
        const user = yield prisma.user.upsert({
            where: { email: payload.email },
            update: {
                picture: payload.picture,
            },
            create: {
                email: payload.email,
                picture: payload.picture,
                password: yield bcrypt.hash(createRandomString(), 10),
            },
        });
        // Upsert auth provider
        yield prisma.authProvider.upsert({
            where: {
                providerId: payload.sub,
            },
            update: {
                accessToken: accessToken || undefined,
                refreshToken: refreshToken || undefined,
            },
            create: {
                userId: user.id,
                provider: "google",
                providerId: payload.sub,
                accessToken: accessToken || "",
                refreshToken: refreshToken || "",
            },
        });
        // Create a new session
        const session = yield prisma.session.upsert({
            where: {
                userId: user.id, // Assuming session is unique by userId
            },
            update: {
                expiresAt: add(new Date(), { days: 7 }),
            },
            create: {
                userId: user.id,
                expiresAt: add(new Date(), { days: 7 }),
            },
        });
        // Set sessionId cookie
        cookies.set(res, "sessionId", session.id);
        ("redirecting to dashboard");
        res.redirect(`${FRONTEND_URL}/dashboard`);
    }
    catch (err) {
        console.error(err);
        return res.redirect(`${FRONTEND_URL}/signup`);
    }
});
// Renew the access token with the refresh token
const refreshAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const googleAuthProvider = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user.authProviders.find((provider) => provider.provider === "google");
    if (!googleAuthProvider) {
        throw new InternalServerError("Google auth provider not found");
    }
    googleOAuth2Client.setCredentials({
        refresh_token: googleAuthProvider.refreshToken,
    });
    const { credentials } = yield googleOAuth2Client.refreshAccessToken();
    const accessToken = credentials.access_token;
    if (!accessToken) {
        throw new InternalServerError("Failed to refresh access token");
    }
    yield prisma.authProvider.update({
        where: {
            id: googleAuthProvider.providerId,
        },
        data: {
            accessToken,
        },
    });
    res.status(200).json({ message: "Access token refreshed" });
});
export { getUserGoogleInfo, handleGoogleCallback, handleGoogleLogin, refreshAccessToken, };
