import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import fs from "fs";
import path from "path";
import pdf from "html-pdf";
import { v4 as uuidv4 } from "uuid";
import chardet from "chardet";

interface SearchParams {
  startDate?: string;
  endDate?: string;
  subject?: string;
  body?: string;
  sender?: string;
}

interface AttachmentPart {
  content: Buffer;
  contentDisposition?: string;
  disposition?: {
    params?: { filename?: string };
  };
  params?: { name?: string };
}

function cleanFilename(text: string): string {
  return text.replace(/[^a-z0-9]/gi, "_");
}

function getRelevantKeyword(subject: string): string {
  const subjectLower = subject.toLowerCase();
  for (const kw of ["invoice", "receipt", "order"]) {
    if (subjectLower.includes(kw)) return kw;
  }
  return "attachment";
}

function convertHtmlToPdf(htmlPath: string, pdfPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = { format: "A4", timeout: 900000 };
    const htmlContent = fs.readFileSync(htmlPath, "utf8");
    pdf.create(htmlContent, options).toFile(pdfPath, (err: Error | null) => {
      if (err) return reject(err);
      fs.unlinkSync(htmlPath);
      resolve(pdfPath);
    });
  });
}

async function saveHtml(content: string, subject = "", folder = "invoices"): Promise<void> {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);

  const relevantKw = getRelevantKeyword(subject);
  const uniqueId = uuidv4();
  const htmlFile = path.join(folder, `${relevantKw}_${uniqueId}.html`);
  const pdfFile = path.join(folder, `${relevantKw}_${uniqueId}.pdf`);

  fs.writeFileSync(htmlFile, content, "utf8");
  try {
    await convertHtmlToPdf(htmlFile, pdfFile);
    console.log(`Created PDF: ${pdfFile}`);
  } catch (e) {
    console.log(`Failed to convert HTML to PDF: ${e}`);
  }
}

function saveAttachment(part: AttachmentPart, subject = "", folder = "invoices"): void {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);

  const decodedName =
    part.disposition?.params?.filename || part.params?.name || "attachment.pdf";
  let ext = path.extname(decodedName);
  if (!ext) ext = ".pdf";

  const relevantKw = getRelevantKeyword(subject);
  const uniqueId = uuidv4();
  const safeFilename = `${relevantKw}_${uniqueId}${ext}`;
  const filepath = path.join(folder, safeFilename);

  fs.writeFileSync(filepath, part.content, { encoding: "binary" });
  console.log(`Saved attachment: ${filepath}`);
}

function subjectMentionsInvoice(subject = ""): boolean {
  const lower = subject.toLowerCase();
  const keywords = ["invoice", "receipt", "amount", "order", "subtotal", "total", "billing"];
  return keywords.some((kw) => lower.includes(kw));
}

async function parseAndProcessEmail(raw: Buffer, folder = "inbox"): Promise<void> {
  const mail: ParsedMail = await simpleParser(raw);
  const subject = mail.subject || "";
  console.log(`Processing email from ${mail.from?.text} with subject: ${subject}`);

  if (!subjectMentionsInvoice(subject)) return;

  if (mail.attachments) {
    for (const att of mail.attachments) {
      if (att.contentDisposition === "attachment") {
        saveAttachment(
          {
            content: att.content,
            contentDisposition: att.contentDisposition,
            disposition: att.disposition,
            params: att.params,
          },
          subject,
          "invoices"
        );
      }
    }
  }

  const htmlBody = mail.html || "";
  if (htmlBody) await saveHtml(htmlBody, subject);
}

export default async function processEmailsConcurrently(
  username: string,
  password: string,
  { startDate, endDate, subject, body, sender }: SearchParams = {}
): Promise<void> {
  console.log(username, password, startDate, endDate, subject, body, sender)
  console.log("Initializing IMAP connection...");
  const imap = new Imap({
    user: username,
    password,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  });

  return new Promise((resolve, reject) => {
    imap.once("ready", () => {
      console.log("IMAP connection ready.");

      imap.openBox("INBOX", false, (err: Error | null) => {
        if (err) {
          console.error("Error opening INBOX:", err);
          return reject(err);
        }
        console.log("INBOX opened successfully.");

        const searchCriteria: any[] = [];

        if (startDate) searchCriteria.push(["SINCE", startDate]);
        if (endDate) searchCriteria.push(["BEFORE", endDate]);
        if (sender) searchCriteria.push(["FROM", sender]);
        if (body) searchCriteria.push(["BODY", body]);
        if (subject) {
          // For partial subject match, you can do ["SUBJECT", subject]
          searchCriteria.push(["SUBJECT", subject]);
        }
        // If nothing was provided, default to searching all
        if (!searchCriteria.length) searchCriteria.push("ALL");

        console.log("Using IMAP search criteria:", searchCriteria);

        imap.search(searchCriteria, (searchErr, results) => {
          if (searchErr) {
            console.error("Error during search:", searchErr);
            return reject(searchErr);
          }
          if (!results || !results.length) {
            console.log("No matching emails found.");
            imap.end();
            return resolve();
          }

          console.log("Emails found:", results);
          const f = imap.fetch(results, { bodies: "" });
          const tasks: Promise<void>[] = [];

          f.on("message", (msg, seqno) => {
            console.log(`Fetching email #${seqno}`);
            msg.on("body", (stream) => {
              let raw = Buffer.alloc(0);
              stream.on("data", (chunk: Buffer) => {
                raw = Buffer.concat([raw, chunk]);
              });
              stream.on("end", () => {
                console.log(`Finished reading email #${seqno}`);
                tasks.push(parseAndProcessEmail(raw));
              });
            });
            msg.on("end", () => {
              console.log(`Message #${seqno} processing complete.`);
            });
          });

          f.once("end", async () => {
            console.log("Finished fetching all emails.");
            try {
              await Promise.all(tasks);
              console.log("All emails processed successfully.");
            } catch (allErr) {
              console.error("Error during email processing:", allErr);
            }
            imap.end();
            resolve();
          });
        });
      });
    });

    imap.once("error", (err: Error) => {
      console.error("IMAP error:", err);
      reject(err);
    });

    imap.once("end", () => {
      console.log("IMAP connection closed.");
    });

    imap.connect();
  });
}
