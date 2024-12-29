import { fromBuffer } from "pdf2pic";

export async function convertPdfToJpeg(pdfBuffer: Buffer): Promise<Buffer> {
  const convert = fromBuffer(pdfBuffer, {
    density: 450,
    format: "jpeg",
    width: 768,
    height: 1024,
  });
  const result = await convert(1, { responseType: "buffer" });
  if (!result.buffer) {
    throw new Error("Failed to convert PDF to JPEG");
  }
  return result.buffer;
}
