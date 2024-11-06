import { Router } from "express";
import {
  authenticateUser,
  createUser,
  deleteUserExpense,
  getUserSpreadsheetsInfo,
  loginUser,
  logoutUser,
  updateUser,
  updateUserExpense,
  updateUserSpreadsheetName,
  updateUserSpreadsheetScreenshot,
} from "../controllers/userController.js";
import { ensureAuthenticated } from "../middleware/authMiddleware.js";
import { upload } from "../utils/multerConfig.js";

const router = Router();

router.get("/authenticate", ensureAuthenticated, authenticateUser);
router.post("/login", loginUser);
router.post("/signup", createUser);
router.get("/logout", logoutUser);
router.get(
  "/spreadsheets-shallow-info",
  ensureAuthenticated,
  getUserSpreadsheetsInfo,
);
router.put("/", ensureAuthenticated, updateUser);
router.delete("/update-expenses", ensureAuthenticated, deleteUserExpense);
router.patch("/update-expenses", ensureAuthenticated, updateUserExpense);
router.patch(
  "/update-spreadsheet-screenshot/:spreadsheetId",
  ensureAuthenticated,
  upload.single("file"),
  updateUserSpreadsheetScreenshot,
);
router.patch(
  "/update-spreadsheet-name",
  ensureAuthenticated,
  updateUserSpreadsheetName,
);

export { router as userRoutes };
