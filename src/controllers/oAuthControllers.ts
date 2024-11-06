import { OAuth2Client } from "google-auth-library";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import {
  FRONTEND_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SERVER_URL,
} from "../config/env.js";
import { InternalServerError } from "../errors/ApiErrors.js";
import cookies from "../cookies.js";
import prisma from "../prisma/index.js";
import { AuthenticatedRequest } from "../interfaces/requestInterfaces.js";
import { add } from "date-fns";
import { createRandomString } from "../utils/createRandomString.js";

const googleOAuth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${SERVER_URL}/auth/google/callback`
);

// Function to initiate Google login
const handleGoogleLogin = async (req: Request, res: Response) => {
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
};

const getUserGoogleInfo = async (req: AuthenticatedRequest, res: Response) => {
  const googleAuthProvider = req.session.user.authProviders.find(
    (provider) => provider.provider === "google"
  );
  if (!googleAuthProvider) {
    throw new InternalServerError("Google auth provider not found");
  }
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${googleAuthProvider.accessToken}`
  );
  if (!response.ok) {
    throw new InternalServerError("Failed to fetch user info from Google");
  }
  const userData = await response.json();
  res.status(200).json(userData);
};

// Function to handle the Google OAuth2 callback
const handleGoogleCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code;
    if (!code || typeof code !== "string") {
      return res.redirect(`${FRONTEND_URL}/signup`);
    }

    const { tokens } = await googleOAuth2Client.getToken(code);
    const {
      id_token: idToken,
      access_token: accessToken,
      refresh_token: refreshToken,
    } = tokens;
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
    const ticket = await googleOAuth2Client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new InternalServerError("Invalid ID token");
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {
        picture: payload.picture,
      },
      create: {
        email: payload.email,
        picture: payload.picture,
        password: await bcrypt.hash(createRandomString(), 10),
      },
    });

    // Upsert auth provider
    await prisma.authProvider.upsert({
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
    const session = await prisma.session.upsert({
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
  } catch (err) {
    console.error(err);
    return res.redirect(`${FRONTEND_URL}/signup`);
  }
};

// Renew the access token with the refresh token
const refreshAccessToken = async (req: AuthenticatedRequest, res: Response) => {
  const googleAuthProvider = req.session.user.authProviders.find(
    (provider) => provider.provider === "google"
  );
  if (!googleAuthProvider) {
    throw new InternalServerError("Google auth provider not found");
  }
  googleOAuth2Client.setCredentials({
    refresh_token: googleAuthProvider.refreshToken,
  });
  const { credentials } = await googleOAuth2Client.refreshAccessToken();
  const accessToken = credentials.access_token;
  if (!accessToken) {
    throw new InternalServerError("Failed to refresh access token");
  }
  await prisma.authProvider.update({
    where: {
      id: googleAuthProvider.providerId,
    },
    data: {
      accessToken,
    },
  });

  res.status(200).json({ message: "Access token refreshed" });
};

export {
  getUserGoogleInfo,
  handleGoogleCallback,
  handleGoogleLogin,
  refreshAccessToken,
};
