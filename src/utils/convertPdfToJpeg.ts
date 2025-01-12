import { fromBuffer } from "pdf2pic";

export async function convertPdfToJpeg(pdfBuffer: Buffer): Promise<Buffer> {
  console.log("Starting PDF to JPEG conversion...");

  // Log the input buffer size
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("Input PDF buffer is empty");
  }
  console.log("Input PDF buffer size:", pdfBuffer.length);

  // Initialize the conversion
  const convert = fromBuffer(pdfBuffer, {
    density: 450,
    format: "jpeg",
    width: 768,
    height: 1024,
  });
  console.log("Conversion settings initialized");

  try {
    // Attempt to convert the first page of the PDF
    console.log("Starting conversion of the first page...");
    const result = await convert(1, { responseType: "buffer" });

    // Check the result
    if (!result || !result.buffer) {
      console.error("Conversion failed: Empty result buffer");
      throw new Error("Failed to convert PDF to JPEG: Empty result buffer");
    }
    console.log("Conversion successful. Output buffer size:", result.buffer.length);

    return result.buffer;
  } catch (error) {
    // Log any errors encountered during the conversion
    console.error("Error during PDF to JPEG conversion:", error.message);
    throw error;
  }
}
