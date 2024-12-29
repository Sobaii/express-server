import { Request, Response } from "express";
import xlsx from "xlsx";
import { s3GetFileSignedUrl, s3UploadFile } from "../services/s3Service.js";
import { analyzeFile } from "../services/ocrService.js";
import { RECEIPT_BUCKET_NAME } from "../utils/constants.js";
import { NotFoundError, UnauthorizedError, ValidationError } from "../errors/ApiErrors.js";
import asyncHandler from "../middleware/asyncErrorHandler.js";
import prisma from "../prisma/index.js"; 
import { Expense } from "@prisma/client";
import { convertPdfToJpeg } from "../utils/convertPdfToJpeg.js";

const createSpreadsheet = asyncHandler(async (req: Request, res: Response) => {
  const { spreadsheetName } = req.body;
  const spreadsheet = await prisma.spreadsheet.create({
    data: {
      name: spreadsheetName,
      userId: req.session.userId
    }
  })
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
      
      if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png" && file.mimetype !== "application/pdf") {
        throw new ValidationError("Unsupported file type");
      }
      
      if (file.mimetype === "application/pdf") {
        file.buffer = await convertPdfToJpeg(file.buffer);  
        file.mimetype = "image/jpeg";
      }
      
      const fileKey = await s3UploadFile(
        RECEIPT_BUCKET_NAME,
        file.buffer,
        file.mimetype,
      );
      const imageUrl = await s3GetFileSignedUrl(RECEIPT_BUCKET_NAME, fileKey);
      const data = await analyzeFile(imageUrl);
      const sanitizedData = JSON.parse(JSON.stringify(data).replace(/\0/g, ''));
      const expense = await prisma.expense.create({
        data: {
          ...sanitizedData,
          spreadsheetId: spreadsheetId,
          fileKey: fileKey,
        },
      });
      console.log("Expense created:", expense);

      return { ...expense, fileKey };
    }),
  );

  console.log("All files processed successfully");
  res.status(200).json(processedResults);
});


const getSpreadsheet = asyncHandler(async (req: Request, res: Response) => { 
  const { spreadsheetId } = req.params; 
  const spreadsheet = await prisma.spreadsheet.update({
    where: { id: spreadsheetId, userId: req.session?.userId },
    data: { lastOpened: new Date() },
    include: { expenses: true }
  });

  if (!spreadsheet) throw new NotFoundError("Spreadsheet not found");

  res.status(200).json(spreadsheet);
});


const downloadExpensesXLSX = asyncHandler(async (
  req: Request,
  res: Response,
) => {
   
  const { selectedFields }: { selectedFields: string[] } = req.body;
  const { spreadsheetId } = req.params;

  // Fetch the spreadsheet
  const spreadsheet = await prisma.spreadsheet.update({
    where: { id: spreadsheetId, userId: req.session?.userId },
    data: { lastOpened: new Date() },
    include: { expenses: true }
  });
  if (!spreadsheet) throw new NotFoundError("Spreadsheet not found");
  if (!spreadsheet.expenses) throw new NotFoundError("Spreadsheet has no expenses");

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
        {},
      );

      groups[category].push(filteredExpense);
      return groups;
    },
    {},
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
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", 'attachment; filename="Expenses.xlsx"');
  res.status(200).send(buffer);
});

const deleteSpreadsheet = asyncHandler(async (req: Request, res: Response) => { 
  const { spreadsheetId } = req.body;
  await prisma.spreadsheet.delete({
    where: { id: spreadsheetId, userId: req.session?.userId },
  })
  res.status(200).json({ message: "Spreadsheet deleted successfully" });
});

// Exporting the functions as named exports
export {
  createSpreadsheet,
  deleteSpreadsheet,
  downloadExpensesXLSX,
  getS3FileUrl,
  getSpreadsheet,
  uploadExpenses,
};
