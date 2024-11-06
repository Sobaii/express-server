import dotenv from "dotenv";
import express, { Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import {expenseRoutes, oAuthRoutes, userRoutes} from "./routes/index.js"; 
import { FRONTEND_URL, COOKIE_SECRET, PORT } from "./config/env.js";
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();

const app: Application = express();
app.use(cookieParser(COOKIE_SECRET));

// Security middleware
app.use(helmet());

// Body parsing middleware
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json());

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: "GET,POST,PUT,DELETE, PATCH",
    credentials: true,
  }),
);

app.set("trust proxy", 1); // Trust first proxy

// Rate limiting middleware
const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // Limit each IP to 120 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});
app.use(rateLimiter);

// Routes
app.use("/expenses", expenseRoutes);
app.use("/users", userRoutes);
app.use("/auth", oAuthRoutes);

// ALB health check
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Error handling middleware should be last
app.use(errorHandler);

app.listen(PORT || 3001, () => {
  console.log(`Server running on port ${PORT || 3001}`);
});
