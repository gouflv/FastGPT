import { markdownProcess } from '@fastgpt/global/common/string/markdown';
import mammoth from 'mammoth';
import { PDFExtract, PDFExtractPage, PDFExtractText } from 'pdf.js-extract';

// hack for pdf.js
// @ts-ignore
import * as pdfjs from 'pdf.js-extract/lib/pdfjs/pdf.js';
// @ts-ignore
import * as pdfjsWorker from 'pdf.js-extract/lib/pdfjs/pdf.worker.js';
pdfjsWorker; // keep it!
pdfjs.GlobalWorkerOptions.workerSrc = 'pdf.js-extract/lib/pdfjs/pdf.worker.js';

export async function readRawText(blob: Blob) {
  return {
    rawText: await blob.text()
  };
}

export async function readMdFile(blob: Blob) {
  const md = await readRawText(blob);
  const simpleMd = await markdownProcess({
    rawText: md.rawText
  });
  return { rawText: simpleMd };
}

// TODO: detect and remove header,footer
export async function readPdfFile(blob: Blob) {
  const pdfe = new PDFExtract();
  const buffer = Buffer.from(await blob.arrayBuffer());
  const data = await pdfe.extractBuffer(buffer, {
    normalizeWhitespace: true
  });
  function isHeaderFooter(text: PDFExtractText, page: PDFExtractPage) {
    const viewportHeight = page.pageInfo.height;
    const { y } = text;
    return y < viewportHeight * 0.05 || y > viewportHeight * 0.95;
  }
  // extract text
  const text = data.pages
    .flatMap((page) => page.content.filter((t) => !isHeaderFooter(t, page)))
    .map((content) => content.str)
    .join('\n');
  return { rawText: text };
}

export async function readWordFile(blob: Blob) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const { value: html } = await mammoth.convertToHtml({
    buffer
  });
  const md = htmlStr2Md(html);
  const rawText = await markdownProcess({
    rawText: md
  });
  return {
    rawText
  };
}

// Reference web/common/string/markdown.ts
// @ts-ignore
import TurndownService from 'turndown';
// @ts-ignore
import * as turndownPluginGfm from 'joplin-turndown-plugin-gfm';
import jsdom from 'jsdom';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full'
});
export const htmlStr2Md = (html: string) => {
  const dom = new jsdom.JSDOM(html);

  turndownService.remove(['i', 'script', 'iframe']);
  turndownService.addRule('codeBlock', {
    filter: 'pre',
    replacement(_, node) {
      const content = node.textContent?.trim() || '';
      // @ts-ignore
      const codeName = node?._attrsByQName?.class?.data?.trim() || '';

      return `\n\`\`\`${codeName}\n${content}\n\`\`\`\n`;
    }
  });

  turndownService.use(turndownPluginGfm.gfm);

  return turndownService.turndown(dom.window.document);
};
