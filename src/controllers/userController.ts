import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { s3GetFileSignedUrl, s3UploadFile } from "../services/s3Service.js";
import { USER_SPREADSHEET_BUCKET_NAME } from "../utils/constants.js";
import cookies from "../utils/cookies.js";
import { NotFoundError, ValidationError } from "../errors/ApiErrors.js";
import prisma from "../prisma/index.js";
import asyncHandler from "../middleware/asyncErrorHandler.js";
import { add } from "date-fns";
import { Expense } from "@prisma/client";

const authenticateUser = async (req: Request, res: Response) => {
  res.status(200).json(req.session?.user);
};

const createUser = async (req: Request, res: Response) => {
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
    throw new ValidationError(
      "Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character"
    );
  }

  const userExists = await prisma.user.findUnique({ where: { email } });

  if (userExists) {
    throw new ValidationError("User already exists");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: add(new Date(), { days: 7 }),
    },
  });

  cookies.set(res, "sessionId", session.id);
  res.status(200).json({ message: "Signed up successfully" });
};

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (
    !user ||
    !user.password ||
    !(await bcrypt.compare(password, user.password))
  ) {
    throw new ValidationError("Invalid email or password");
  }

  const session = await prisma.session.update({
    where: {
      userId: user.id,
    },
    data: {
      expiresAt: add(new Date(), { days: 7 }),
    },
  });

  cookies.set(res, "session", session.id);
  res.status(200).json({ message: "Login successful" });
});

const logoutUser = async (req: Request, res: Response) => {
  await prisma.session.delete({
    where: {
      id: req.session?.id,
    },
  });
  cookies.delete(res, "sessionId");
  res.status(200).json({ message: "Logged out" });
};

const updateUser = async (req: Request, res: Response) => {
  const updatedUser = await prisma.user.update({
    where: { id: req.session?.userId },
    data: req.body,
  });
  res.status(200).json(updatedUser);
};

const deleteUserExpense = async (req: Request, res: Response) => {
  const { expenses, spreadsheetId } = req.body;

  const spreadsheet = await prisma.spreadsheet.findFirst({
    where: { id: spreadsheetId, userId: req.session?.userId },
  });

  if (!spreadsheet) {
    throw new NotFoundError("Spreadsheet not found");
  }

  const deletePromises = expenses.map((id: string) => {
    return prisma.expense.delete({
      where: { id },
    });
  });

  await Promise.all(deletePromises);

  res.status(200).json({ message: "Expenses deleted" });
};

const updateUserExpense = async (req: Request, res: Response) => {
  const { expenses, spreadsheetId } = req.body;

  const spreadsheet = await prisma.spreadsheet.findFirst({
    where: { id: spreadsheetId, userId: req.session?.userId },
  });

  if (!spreadsheet) {
    throw new NotFoundError("Spreadsheet not found");
  }
  const upsertPromises = expenses.map((expense: Expense) => {
    const { id, ...restExpense } = expense;
    return prisma.expense.upsert({
      where: { id },
      create: {
        ...restExpense,
        spreadsheetId: spreadsheet.id,
      },
      update: {
        ...restExpense,
        spreadsheetId: spreadsheet.id,
      },
    });
  });

  const createdExpenses = await Promise.all(upsertPromises);

  res.status(200).json(createdExpenses);
};

const updateUserSpreadsheetName = async (
  req: Request,
  res: Response
) => {
  const { name, spreadsheetId } = req.body;
  const spreadsheet = prisma.spreadsheet.update({
    where: { id: spreadsheetId, userId: req.session?.userId },
    data: { name },
  });

  if (!spreadsheet) {
    throw new NotFoundError("Spreadsheet not found");
  }
  res.status(200).json({ message: "Spreadsheet name updated" });
};

const updateUserSpreadsheetScreenshot = async (
  req: Request,
  res: Response
) => {
  if (!req.file) {
    throw new ValidationError("No file uploaded");
  }
  const { spreadsheetId } = req.params;
  const fileKey = await s3UploadFile(
    USER_SPREADSHEET_BUCKET_NAME,
    req.file.buffer,
    req.file.mimetype
  );
  await prisma.spreadsheet.update({
    where: { id: spreadsheetId, userId: req.session?.userId },
    data: { fileKey },
  });
  res.status(200).json({ message: "Successfully updated spreadsheet" });
};

const getUserSpreadsheetsInfo = async (
  req: Request,
  res: Response
) => {
  const spreadsheets = await prisma.spreadsheet.findMany({
    where: { userId: req.session?.userId },
    include: {
      _count: {
        select: { expenses: true },
      },
    },
  });

  const spreadsheetInfo = await Promise.all(
    spreadsheets.map(async (spreadsheet: any) => {
      const imageUrl = spreadsheet.fileKey
        ? await s3GetFileSignedUrl(
            USER_SPREADSHEET_BUCKET_NAME,
            spreadsheet.fileKey
          )
        : null;
      return {
        name: spreadsheet.name,
        id: spreadsheet.id,
        numberOfExpenses: spreadsheet._count.expenses,
        lastOpened: spreadsheet.lastOpened,
        createdAt: spreadsheet.createdAt,
        imageUrl: imageUrl,
      };
    })
  );
  res.status(200).json(spreadsheetInfo);
};

export {
  authenticateUser,
  createUser,
  getUserSpreadsheetsInfo,
  loginUser,
  logoutUser,
  updateUser,
  deleteUserExpense,
  updateUserExpense,
  updateUserSpreadsheetName,
  updateUserSpreadsheetScreenshot,
};
