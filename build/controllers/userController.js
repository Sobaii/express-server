var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import bcrypt from "bcrypt";
import { s3GetFileSignedUrl, s3UploadFile } from "../services/s3Service.js";
import { USER_SPREADSHEET_BUCKET_NAME } from "../utils/constants.js";
import cookies from "../utils/cookies.js";
import { NotFoundError, ValidationError } from "../errors/ApiErrors.js";
import prisma from "../prisma/index.js";
import asyncHandler from "../middleware/asyncErrorHandler.js";
import { add } from "date-fns";
const authenticateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    res.status(200).json((_a = req.session) === null || _a === void 0 ? void 0 : _a.user);
});
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ValidationError("Email and password are required");
    }
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ValidationError("Invalid email format");
    }
    // Validate password
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
        throw new ValidationError("Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character");
    }
    const userExists = yield prisma.user.findUnique({ where: { email } });
    if (userExists) {
        throw new ValidationError("User already exists");
    }
    const hashedPassword = yield bcrypt.hash(password, 10);
    const user = yield prisma.user.create({
        data: {
            email,
            password: hashedPassword,
        },
    });
    const session = yield prisma.session.create({
        data: {
            userId: user.id,
            expiresAt: add(new Date(), { days: 7 }),
        },
    });
    cookies.set(res, "sessionId", session.id);
    res.status(200).json({ message: "Signed up successfully" });
});
const loginUser = asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ValidationError("Email and password are required");
    }
    const user = yield prisma.user.findUnique({
        where: { email },
    });
    if (!user ||
        !user.password ||
        !(yield bcrypt.compare(password, user.password))) {
        throw new ValidationError("Invalid email or password");
    }
    const session = yield prisma.session.update({
        where: {
            userId: user.id,
        },
        data: {
            expiresAt: add(new Date(), { days: 7 }),
        },
    });
    cookies.set(res, "session", session.id);
    res.status(200).json({ message: "Login successful" });
}));
const logoutUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    yield prisma.session.delete({
        where: {
            id: (_a = req.session) === null || _a === void 0 ? void 0 : _a.id,
        },
    });
    cookies.delete(res, "sessionId");
    res.status(200).json({ message: "Logged out" });
});
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const updatedUser = yield prisma.user.update({
        where: { id: (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId },
        data: req.body,
    });
    res.status(200).json(updatedUser);
});
const deleteUserExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { expenses, spreadsheetId } = req.body;
    const spreadsheet = yield prisma.spreadsheet.findFirst({
        where: { id: spreadsheetId, userId: (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId },
    });
    if (!spreadsheet) {
        throw new NotFoundError("Spreadsheet not found");
    }
    const deletePromises = expenses.map((id) => {
        return prisma.expense.delete({
            where: { id },
        });
    });
    yield Promise.all(deletePromises);
    res.status(200).json({ message: "Expenses deleted" });
});
const updateUserExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { expenses, spreadsheetId } = req.body;
    const spreadsheet = yield prisma.spreadsheet.findFirst({
        where: { id: spreadsheetId, userId: (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId },
    });
    if (!spreadsheet) {
        throw new NotFoundError("Spreadsheet not found");
    }
    const upsertPromises = expenses.map((expense) => {
        const { id } = expense, restExpense = __rest(expense, ["id"]);
        return prisma.expense.upsert({
            where: { id },
            create: Object.assign(Object.assign({}, restExpense), { spreadsheetId: spreadsheet.id }),
            update: Object.assign(Object.assign({}, restExpense), { spreadsheetId: spreadsheet.id }),
        });
    });
    const createdExpenses = yield Promise.all(upsertPromises);
    res.status(200).json(createdExpenses);
});
const updateUserSpreadsheetName = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name, spreadsheetId } = req.body;
    const spreadsheet = prisma.spreadsheet.update({
        where: { id: spreadsheetId, userId: (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId },
        data: { name },
    });
    if (!spreadsheet) {
        throw new NotFoundError("Spreadsheet not found");
    }
    res.status(200).json({ message: "Spreadsheet name updated" });
});
const updateUserSpreadsheetScreenshot = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!req.file) {
        throw new ValidationError("No file uploaded");
    }
    const { spreadsheetId } = req.params;
    const fileKey = yield s3UploadFile(USER_SPREADSHEET_BUCKET_NAME, req.file.buffer, req.file.mimetype);
    yield prisma.spreadsheet.update({
        where: { id: spreadsheetId, userId: (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId },
        data: { fileKey },
    });
    res.status(200).json({ message: "Successfully updated spreadsheet" });
});
const getUserSpreadsheetsInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const spreadsheets = yield prisma.spreadsheet.findMany({
        where: { userId: (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId },
        include: {
            _count: {
                select: { expenses: true },
            },
        },
    });
    const spreadsheetInfo = yield Promise.all(spreadsheets.map((spreadsheet) => __awaiter(void 0, void 0, void 0, function* () {
        const imageUrl = spreadsheet.fileKey
            ? yield s3GetFileSignedUrl(USER_SPREADSHEET_BUCKET_NAME, spreadsheet.fileKey)
            : null;
        return {
            name: spreadsheet.name,
            id: spreadsheet.id,
            numberOfExpenses: spreadsheet._count.expenses,
            lastOpened: spreadsheet.lastOpened,
            createdAt: spreadsheet.createdAt,
            imageUrl: imageUrl,
        };
    })));
    res.status(200).json(spreadsheetInfo);
});
export { authenticateUser, createUser, getUserSpreadsheetsInfo, loginUser, logoutUser, updateUser, deleteUserExpense, updateUserExpense, updateUserSpreadsheetName, updateUserSpreadsheetScreenshot, };
