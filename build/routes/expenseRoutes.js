import { Router } from "express";
import { createSpreadsheet, deleteSpreadsheet, downloadExpensesXLSX, getS3FileUrl, getSpreadsheet, uploadExpenses, } from "../controllers/expenseControllers.js";
import { upload } from "../utils/multerConfig.js";
import { ensureAuthenticated } from "../middleware/authMiddleware.js";
const router = Router();
// Define routes
router.post("/upload", ensureAuthenticated, upload.array("files", 2000), uploadExpenses);
router.post("/create-spreadsheet", ensureAuthenticated, createSpreadsheet);
router.get("/spreadsheet/:spreadsheetId", ensureAuthenticated, getSpreadsheet);
router.get("/fileUrl/:fileKey", ensureAuthenticated, getS3FileUrl);
router.post("/download/:spreadsheetId", ensureAuthenticated, downloadExpensesXLSX);
router.delete("/delete-spreadsheet", ensureAuthenticated, deleteSpreadsheet);
export { router as expenseRoutes };
