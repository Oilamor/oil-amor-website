/**
 * Oil Amor — Enterprise PDF Label Generator
 *
 * Server-side PDF generation using puppeteer-core + @sparticuz/chromium.
 * Falls back to HTML-only if Chromium is unavailable (e.g., local dev without Chrome).
 */

import puppeteer from 'puppeteer-core';
import { logger } from '@/lib/logging/logger';

let chromiumPath: string | null = null;

async function getChromiumPath(): Promise<string | null> {
  if (chromiumPath) return chromiumPath;

  // Production / serverless: use @sparticuz/chromium
  try {
    const chromium = await import('@sparticuz/chromium');
    const path = await chromium.default.executablePath();
    if (path) {
      chromiumPath = path;
      return path;
    }
  } catch {
    // Not available — fall through
  }

  // Development: check environment variable
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    return chromiumPath;
  }

  // Try common Chrome/Chromium paths by platform
  const platformPaths: Record<string, string[]> = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    ],
  };

  const { execSync } = await import('child_process');
  const paths = platformPaths[process.platform] || [];

  for (const p of paths) {
    try {
      execSync(`"${p}" --version`, { stdio: 'ignore' });
      chromiumPath = p;
      return p;
    } catch {
      // Not found at this path
    }
  }

  return null;
}

export interface PdfGenerationResult {
  pdf: Uint8Array | null;
  html: string;
  format: 'pdf' | 'html';
  dimensions: { width: string; height: string };
}

/**
 * Generate a PDF from label HTML.
 * Returns PDF if Chromium is available, otherwise returns HTML fallback.
 */
export async function generateLabelPdf(
  html: string,
  widthMm: number,
  heightMm: number
): Promise<PdfGenerationResult> {
  const executablePath = await getChromiumPath();

  if (!executablePath) {
    return {
      pdf: null,
      html,
      format: 'html',
      dimensions: { width: `${widthMm}mm`, height: `${heightMm}mm` },
    };
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage();

    // Set viewport to match label dimensions at high DPI for crisp output
    const dpi = 300;
    const pxPerMm = dpi / 25.4;
    await page.setViewport({
      width: Math.round(widthMm * pxPerMm),
      height: Math.round(heightMm * pxPerMm),
      deviceScaleFactor: 1,
    });

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    const pdfBuffer = await page.pdf({
      width: `${widthMm}mm`,
      height: `${heightMm}mm`,
      printBackground: true,
      preferCSSPageSize: true,
      scale: 1.5, // High-res output
    });
    const pdf = new Uint8Array(pdfBuffer);

    return {
      pdf,
      html,
      format: 'pdf',
      dimensions: { width: `${widthMm}mm`, height: `${heightMm}mm` },
    };
  } catch (error) {
    logger.error('[PDF] Generation failed', error instanceof Error ? error : new Error(String(error)));
    return {
      pdf: null,
      html,
      format: 'html',
      dimensions: { width: `${widthMm}mm`, height: `${heightMm}mm` },
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
