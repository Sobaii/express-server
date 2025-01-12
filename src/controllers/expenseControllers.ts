import { Request, Response } from "express";
import fs from "fs";
import xlsx from "xlsx";
import { s3GetFileSignedUrl, s3UploadFile } from "../services/s3Service.js";
import { analyzeFile } from "../services/ocrService.js";
import { RECEIPT_BUCKET_NAME } from "../utils/constants.js";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../errors/ApiErrors.js";
import asyncHandler from "../middleware/asyncErrorHandler.js";
import prisma from "../prisma/index.js";
import { Expense } from "@prisma/client";
import { convertPdfToJpeg } from "../utils/convertPdfToJpeg.js";
import processEmailsConcurrently from "../services/gmailService.js";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

const createSpreadsheet = asyncHandler(async (req: Request, res: Response) => {
  const { spreadsheetName } = req.body;
  const spreadsheet = await prisma.spreadsheet.create({
    data: {
      name: spreadsheetName,
      userId: req.session.userId,
    },
  });
  res.status(200).json(spreadsheet);
});

const getS3FileUrl = asyncHandler(async (req: Request, res: Response) => {
  const { fileKey } = req.params;
  const url = await s3GetFileSignedUrl(RECEIPT_BUCKET_NAME, fileKey);
  res.status(200).json({ url });
});

const uploadExpenses = asyncHandler(async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    console.log("No files uploaded");
    throw new ValidationError("No files uploaded");
  }

  const { spreadsheetId } = req.body;

  const processedResults = await Promise.all(
    (req.files as Express.Multer.File[]).map(async (file) => {
      console.log("Processing file:", file.originalname);

      if (
        file.mimetype !== "image/jpeg" &&
        file.mimetype !== "image/png" &&
        file.mimetype !== "application/pdf"
      ) {
        throw new ValidationError("Unsupported file type");
      }

      if (file.mimetype === "application/pdf") {
        file.buffer = await convertPdfToJpeg(file.buffer);
        file.mimetype = "image/jpeg";
      }

      const fileKey = await s3UploadFile(
        RECEIPT_BUCKET_NAME,
        file.buffer,
        file.mimetype
      );
      const imageUrl = await s3GetFileSignedUrl(RECEIPT_BUCKET_NAME, fileKey);
      const data = await analyzeFile(imageUrl);
      const sanitizedData = JSON.parse(JSON.stringify(data).replace(/\0/g, ""));
      const expense = await prisma.expense.create({
        data: {
          ...sanitizedData,
          spreadsheetId: spreadsheetId,
          fileKey: fileKey,
        },
      });
      return { ...expense, fileKey };
    })
  );

  console.log("All files processed successfully");
  res.status(200).json(processedResults);
});

const getSpreadsheet = asyncHandler(async (req: Request, res: Response) => {
  const { spreadsheetId } = req.params;
  const spreadsheet = await prisma.spreadsheet.update({
    where: { id: spreadsheetId, userId: req.session?.userId },
    data: { lastOpened: new Date() },
    include: { expenses: true },
  });

  if (!spreadsheet) throw new NotFoundError("Spreadsheet not found");

  res.status(200).json(spreadsheet);
});

const downloadExpensesXLSX = asyncHandler(
  async (req: Request, res: Response) => {
    const { selectedFields }: { selectedFields: string[] } = req.body;
    const { spreadsheetId } = req.params;

    // Fetch the spreadsheet
    const spreadsheet = await prisma.spreadsheet.update({
      where: { id: spreadsheetId, userId: req.session?.userId },
      data: { lastOpened: new Date() },
      include: { expenses: true },
    });
    if (!spreadsheet) throw new NotFoundError("Spreadsheet not found");
    if (!spreadsheet.expenses)
      throw new NotFoundError("Spreadsheet has no expenses");

    // Group expenses by category
    const categoryGroups = spreadsheet.expenses.reduce(
      (groups: any, expense: any) => {
        const category = expense.category; // Assuming 'category' is the correct field

        if (!groups[category]) groups[category] = [];

        // Filter expense fields based on selectedFields
        const filteredExpense = selectedFields.reduce(
          (acc: Record<string, any>, field: string) => {
            if (expense[field as keyof Expense]) {
              acc[field] = expense[field as keyof Expense];
            }
            return acc;
          },
          {}
        );

        groups[category].push(filteredExpense);
        return groups;
      },
      {}
    );

    // Create workbook and worksheets
    const workbook = xlsx.utils.book_new();
    Object.entries(categoryGroups).forEach(([category, data]) => {
      const worksheet = xlsx.utils.json_to_sheet(data as []);
      xlsx.utils.book_append_sheet(workbook, worksheet, category);
    });

    // Write workbook to buffer and send as response
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Expenses.xlsx"'
    );
    res.status(200).send(buffer);
  }
);

const deleteSpreadsheet = asyncHandler(async (req: Request, res: Response) => {
  const { spreadsheetId } = req.body;
  await prisma.spreadsheet.delete({
    where: { id: spreadsheetId, userId: req.session?.userId },
  });
  res.status(200).json({ message: "Spreadsheet deleted successfully" });
});
const aggregateInbox = asyncHandler(async (req: Request, res: Response) => {
  const {
    email,
    appPassword,
    spreadsheetId,
    startDate,
    endDate,
    subject,
    body,
    sender,
  } = req.body;

  console.log("Received request body:", req.body);

  if (!email) {
    console.error("Validation Error: Email missing");
    throw new ValidationError("Email missing");
  }
  if (!appPassword) {
    console.error("Validation Error: App password missing");
    throw new ValidationError("App password missing");
  }
  if (!spreadsheetId) {
    console.error("Validation Error: Spreadsheet ID missing");
    throw new ValidationError("Spreadsheet ID missing");
  }

  console.log("Starting email processing...");
  await processEmailsConcurrently(email, appPassword, {
    startDate,
    endDate,
    subject,
    body,
    sender,
  });
  console.log("Finished email processing");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const invoicesDir = path.resolve(__dirname, "../../invoices");

  console.log("Invoices directory path:", invoicesDir);

  const pdfFiles = fs
    .readdirSync(invoicesDir)
    .filter((file) => file.endsWith(".pdf"));

  console.log("PDF files found in directory:", pdfFiles);

  const results = await Promise.all(
    pdfFiles.map(async (pdfFile) => {
      const filePath = path.join(invoicesDir, pdfFile);
      console.log("Processing file:", filePath);

      let buffer = fs.readFileSync(filePath);
      console.log("File read successfully:", pdfFile, "Buffer size:", buffer.length);


      console.log("Converting PDF to JPEG...");
      buffer = await convertPdfToJpeg(buffer);
      if (!buffer || buffer.length === 0) {
        throw new Error("Converted buffer is empty.");
      }
      console.log("PDF converted to JPEG. Buffer size:", buffer.length);

      // Upload file to S3
      // const fileKey = await s3UploadFile(
      //   RECEIPT_BUCKET_NAME,
      //   buffer,
      //   "image/jpeg"
      // );
      // if (!fileKey) {
      //   throw new Error("S3 upload returned an empty file key.");
      // }
      // console.log("File uploaded to S3 with key:", fileKey);

      // console.log("Generating signed URL...");
      // const imageUrl = await s3GetFileSignedUrl("YOUR_BUCKET_NAME", fileKey);
      // console.log("Signed URL generated:", imageUrl);

      // console.log("Analyzing file with OCR...");
      // const data = await analyzeFile(imageUrl);
      // console.log("OCR analysis complete. Data received:", data);

      // const sanitizedData = JSON.parse(JSON.stringify(data).replace(/\0/g, ""));
      // console.log("Sanitized data:", sanitizedData);

      // console.log("Saving data to database...");
      // const expense = await prisma.expense.create({
      //   data: {
      //     ...sanitizedData,
      //     spreadsheetId,
      //     fileKey,
      //   },
      // });
      // console.log("Data saved to database. Expense created:", expense);

      // return expense;
    })
  );

  console.log("All files processed successfully. Results:", results);

  res.status(200).json({ message: "Aggregated successfully", results });
});

export default aggregateInbox;

// Exporting the functions as named exports
export {
  createSpreadsheet,
  deleteSpreadsheet,
  downloadExpensesXLSX,
  getS3FileUrl,
  getSpreadsheet,
  uploadExpenses,
  aggregateInbox,
};
