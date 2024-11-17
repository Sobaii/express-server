var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import xlsx from "xlsx";
import { s3GetFileSignedUrl, s3UploadFile } from "../services/s3Service.js";
import { analyzeFile } from "../services/ocrService.js";
import { RECEIPT_BUCKET_NAME } from "../utils/constants.js";
import { NotFoundError, ValidationError } from "../errors/ApiErrors.js";
import asyncHandler from "../middleware/asyncErrorHandler.js";
import prisma from "../prisma/index.js";
const createSpreadsheet = asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { spreadsheetName } = req.body;
    const spreadsheet = yield prisma.spreadsheet.create({
        data: {
            name: spreadsheetName,
            userId: req.session.userId
        }
    });
    res.status(200).json(spreadsheet);
}));
const getS3FileUrl = asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fileKey } = req.params;
    const url = yield s3GetFileSignedUrl(RECEIPT_BUCKET_NAME, fileKey);
    res.status(200).json({ url });
}));
const uploadExpenses = asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new ValidationError("No files uploaded");
    }
    const { spreadsheetId } = req.body;
    const processedResults = yield Promise.all(req.files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
        if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png") {
            throw new ValidationError("Unsupported file type");
        }
        const fileBuffer = file.buffer;
        const fileKey = yield s3UploadFile(RECEIPT_BUCKET_NAME, fileBuffer, file.mimetype);
        const imageUrl = yield s3GetFileSignedUrl(RECEIPT_BUCKET_NAME, fileKey);
        const data = yield analyzeFile(imageUrl);
        const sanitizedData = JSON.parse(JSON.stringify(data).replace(/\0/g, ''));
        const expense = yield prisma.expense.create({
            data: Object.assign(Object.assign({}, sanitizedData), { spreadsheetId: spreadsheetId, fileKey: fileKey }),
        });
        return Object.assign(Object.assign({}, expense), { fileKey });
    })));
    res.status(200).json(processedResults);
}));
const getSpreadsheet = asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { spreadsheetId } = req.params;
    const spreadsheet = yield prisma.spreadsheet.update({
        where: { id: spreadsheetId, userId: (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId },
        data: { lastOpened: new Date() },
        include: { expenses: true }
    });
    if (!spreadsheet)
        throw new NotFoundError("Spreadsheet not found");
    res.status(200).json(spreadsheet);
}));
const downloadExpensesXLSX = asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { selectedFields } = req.body;
    const { spreadsheetId } = req.params;
    // Fetch the spreadsheet
    const spreadsheet = yield prisma.spreadsheet.update({
        where: { id: spreadsheetId, userId: (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId },
        data: { lastOpened: new Date() },
        include: { expenses: true }
    });
    if (!spreadsheet)
        throw new NotFoundError("Spreadsheet not found");
    if (!spreadsheet.expenses)
        throw new NotFoundError("Spreadsheet has no expenses");
    // Group expenses by category
    const categoryGroups = spreadsheet.expenses.reduce((groups, expense) => {
        const category = expense.category; // Assuming 'category' is the correct field
        if (!groups[category])
            groups[category] = [];
        // Filter expense fields based on selectedFields
        const filteredExpense = selectedFields.reduce((acc, field) => {
            if (expense[field]) {
                acc[field] = expense[field];
            }
            return acc;
        }, {});
        groups[category].push(filteredExpense);
        return groups;
    }, {});
    // Create workbook and worksheets
    const workbook = xlsx.utils.book_new();
    Object.entries(categoryGroups).forEach(([category, data]) => {
        const worksheet = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(workbook, worksheet, category);
    });
    // Write workbook to buffer and send as response
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Expenses.xlsx"');
    res.status(200).send(buffer);
}));
const deleteSpreadsheet = asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { spreadsheetId } = req.body;
    yield prisma.spreadsheet.delete({
        where: { id: spreadsheetId, userId: (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId },
    });
    res.status(200).json({ message: "Spreadsheet deleted successfully" });
}));
// Exporting the functions as named exports
export { createSpreadsheet, deleteSpreadsheet, downloadExpensesXLSX, getS3FileUrl, getSpreadsheet, uploadExpenses, };
