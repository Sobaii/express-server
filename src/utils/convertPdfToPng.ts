import { load } from '@pspdfkit/nodejs';

export async function convertPdfToPng(pdfBytes) {
  const instance = await load({ document: pdfBytes });
  const width = instance.getDocumentInfo().pages[0].width;
  const result = await instance.renderPage(0, { width });
  await instance.close();
  return Buffer.from(result);
}
