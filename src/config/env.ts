// config/config.ts
import dotenv from "dotenv";

dotenv.config();

const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const AWS_ACCESS_KEY_ID = getEnvVar("AWS_ACCESS_KEY_ID");
export const AWS_SECRET_ACCESS_KEY = getEnvVar("AWS_SECRET_ACCESS_KEY");
export const AWS_REGION = getEnvVar("AWS_REGION");
export const PORT = getEnvVar("PORT");
export const MONGODB_URI = getEnvVar("MONGODB_URI");
export const OPENAI_API_KEY = getEnvVar("OPENAI_API_KEY");
export const JWT_ACCESS_SECRET = getEnvVar("JWT_ACCESS_SECRET");
export const JWT_REFRESH_SECRET = getEnvVar("JWT_REFRESH_SECRET");
export const COOKIE_SECRET = getEnvVar("COOKIE_SECRET");
export const GOOGLE_CLIENT_SECRET = getEnvVar("GOOGLE_CLIENT_SECRET");
export const GOOGLE_CLIENT_ID = getEnvVar("GOOGLE_CLIENT_ID");
export const NODE_ENV = getEnvVar("NODE_ENV");
export const SERVER_URL = getEnvVar("SERVER_URL");
export const FRONTEND_URL = getEnvVar("FRONTEND_URL");
export const DATABASE_URL = getEnvVar("DATABASE_URL");