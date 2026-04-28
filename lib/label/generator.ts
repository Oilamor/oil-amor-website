/**
 * Oil Amor — Enterprise Label Generator v4
 *
 * Self-contained HTML label generation with:
 * - Local QR code generation (no external service dependency)
 * - Base64-embedded fonts (no external font loading)
 * - Correct carrier percentage calculation (100 - carrierRatio)
 * - Human-readable carrier oil names
 * - Actual safety score/rating passthrough
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import QRCode from 'qrcode';
import { getOilSafetyProfile } from '@/lib/safety/database';
import type { OilSafetyProfile } from '@/lib/safety/types';

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

export interface LabelSizeConfig {
  widthMm: number;
  heightMm: number;
  maxOils: number;
  maxWarnings: number;
  fontScale: number;
  qrSizeMm: number;
  isRefill: boolean;
}

export const SIZE_CONFIGS: Record<number, LabelSizeConfig> = {
  5:   { widthMm: 55,  heightMm: 18, maxOils: 3,  maxWarnings: 2, fontScale: 0.72, qrSizeMm: 10, isRefill: false },
  10:  { widthMm: 60,  heightMm: 20, maxOils: 4,  maxWarnings: 2, fontScale: 0.78, qrSizeMm: 11, isRefill: false },
  15:  { widthMm: 65,  heightMm: 22, maxOils: 5,  maxWarnings: 3, fontScale: 0.85, qrSizeMm: 12, isRefill: false },
  20:  { widthMm: 70,  heightMm: 25, maxOils: 6,  maxWarnings: 3, fontScale: 0.92, qrSizeMm: 13, isRefill: false },
  30:  { widthMm: 80,  heightMm: 30, maxOils: 8,  maxWarnings: 4, fontScale: 1.00, qrSizeMm: 15, isRefill: false },
  50:  { widthMm: 95,  heightMm: 35, maxOils: 10, maxWarnings: 5, fontScale: 1.12, qrSizeMm: 17, isRefill: true },
  100: { widthMm: 110, heightMm: 40, maxOils: 12, maxWarnings: 6, fontScale: 1.25, qrSizeMm: 20, isRefill: true },
};

export function getSizeConfig(size: number): LabelSizeConfig {
  return SIZE_CONFIGS[size] || SIZE_CONFIGS[30];
}

// ============================================================================
// CARRIER OIL NAME MAPPING
// ============================================================================

export const CARRIER_OIL_NAMES: Record<string, string> = {
  'jojoba': 'Jojoba Oil',
  'fractionated-coconut': 'Fractionated Coconut Oil',
};

export function getCarrierOilName(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return CARRIER_OIL_NAMES[id] || id;
}

// ============================================================================
// TYPES
// ============================================================================

export interface LabelOil {
  name: string;
  percentage: number;
  ml: number;
  oilId?: string;
}

export interface LabelData {
  blendName: string;
  oils: LabelOil[];
  carrierOil?: string;      // machine ID
  carrierPercentage?: number; // ACTUAL carrier percentage (not essential oil %)
  size: number;
  batchId: string;
  madeDate: string;
  expiryDate: string;
  warnings: string[];
  crystal?: string;
  cord?: string;
  intendedUse?: string;
  isRefill?: boolean;
  sourceVolume?: number;
  originalBatchId?: string;
  orderId?: string;
  customerName?: string;
  showIngredients?: boolean;
  showExpiry?: boolean;
  showWarnings?: boolean;
  showQRCode?: boolean;
  showBatchId?: boolean;
  showMadeDate?: boolean;
  showCrystal?: boolean;
  // Safety data (v4 — passthrough actual values)
  safetyScore?: number;
  safetyRating?: string;
}

// ============================================================================
// FONT LOADING (base64 embedded for self-contained output)
// ============================================================================

let fontCache: string | null = null;

function getFontBase64(filename: string): string {
  const path = join(process.cwd(), 'node_modules', filename);
  return readFileSync(path).toString('base64');
}

function buildEmbeddedFonts(): string {
  if (fontCache) return fontCache;

  const fonts = [
    { file: '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2', family: 'Cormorant Garamond', weight: 400 },
    { file: '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2', family: 'Cormorant Garamond', weight: 600 },
    { file: '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff2', family: 'Cormorant Garamond', weight: 700 },
    { file: '@fontsource/inter/files/inter-latin-300-normal.woff2', family: 'Inter', weight: 300 },
    { file: '@fontsource/inter/files/inter-latin-400-normal.woff2', family: 'Inter', weight: 400 },
    { file: '@fontsource/inter/files/inter-latin-500-normal.woff2', family: 'Inter', weight: 500 },
    { file: '@fontsource/inter/files/inter-latin-600-normal.woff2', family: 'Inter', weight: 600 },
  ];

  const faces = fonts.map(f => {
    const b64 = getFontBase64(f.file);
    return `@font-face {
  font-family: '${f.family}';
  font-style: normal;
  font-weight: ${f.weight};
  font-display: swap;
  src: url(data:font/woff2;base64,${b64}) format('woff2');
}`;
  });

  fontCache = faces.join('\n');
  return fontCache;
}

// ============================================================================
// QR CODE GENERATION
// ============================================================================

export async function generateQRCodeDataUrl(url: string, size: number): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: {
      dark: '#0a080c',
      light: '#ffffff',
    },
    type: 'image/png',
  });
}

// ============================================================================
// SAFETY WARNINGS
// ============================================================================

interface ExtractedWarning {
  text: string;
  severity: 'critical' | 'warning' | 'caution' | 'info';
  icon: string;
  category: string;
}

export function extractOilWarnings(oils: LabelOil[]): ExtractedWarning[] {
  const warnings: ExtractedWarning[] = [];
  const seen = new Set<string>();

  for (const oil of oils) {
    if (!oil.oilId) continue;
    const profile = getOilSafetyProfile(oil.oilId);
    if (!profile) continue;

    if (profile.photosensitivity.isPhotosensitive) {
      const key = `photo-${oil.oilId}`;
      if (!seen.has(key)) {
        seen.add(key);
        warnings.push({
          text: `${profile.commonName}: Avoid sun ${profile.photosensitivity.safeAfterHours || 12}+h`,
          severity: 'warning', icon: '☀️', category: 'photosensitivity',
        });
      }
    }

    if (profile.skinSensitization.isSensitizer && profile.skinSensitization.riskLevel !== 'low') {
      const key = `skin-${oil.oilId}`;
      if (!seen.has(key)) {
        seen.add(key);
        warnings.push({
          text: `${profile.commonName}: Skin sensitizer (${profile.skinSensitization.riskLevel})`,
          severity: profile.skinSensitization.riskLevel === 'high' ? 'critical' : 'warning',
          icon: '⚠️', category: 'skin',
        });
      }
    }

    if (profile.pregnancySafety === 'avoid') {
      const key = `preg-${oil.oilId}`;
      if (!seen.has(key)) {
        seen.add(key);
        warnings.push({ text: `${profile.commonName}: Avoid in pregnancy`, severity: 'critical', icon: '🤰', category: 'pregnancy' });
      }
    } else if (profile.pregnancySafety === 'caution') {
      const key = `pregc-${oil.oilId}`;
      if (!seen.has(key)) {
        seen.add(key);
        warnings.push({ text: `${profile.commonName}: Caution in pregnancy`, severity: 'caution', icon: '🤰', category: 'pregnancy' });
      }
    }

    if (profile.toxicity.level !== 'none' && profile.toxicity.level !== 'low') {
      const key = `tox-${oil.oilId}`;
      if (!seen.has(key)) {
        seen.add(key);
        const routes: string[] = [];
        if (profile.toxicity.oral) routes.push('oral');
        if (profile.toxicity.dermal) routes.push('dermal');
        if (profile.toxicity.inhalation) routes.push('inhalation');
        warnings.push({
          text: `${profile.commonName}: Toxic (${routes.join('/')})`,
          severity: profile.toxicity.level === 'extreme' ? 'critical' : 'warning',
          icon: '☠️', category: 'toxicity',
        });
      }
    }

    for (const c of profile.contraindications) {
      const key = `contra-${c.type}-${oil.oilId}`;
      if (!seen.has(key)) {
        seen.add(key);
        warnings.push({
          text: `${profile.commonName}: ${c.description}`,
          severity: c.severity === 'critical' || c.severity === 'avoid' ? 'critical' : 'warning',
          icon: '🚫', category: 'contraindication',
        });
      }
    }

    for (const di of profile.drugInteractions) {
      const key = `drug-${di.drugClass}-${oil.oilId}`;
      if (!seen.has(key)) {
        seen.add(key);
        warnings.push({
          text: `${profile.commonName}: ${di.drugClass} interaction`,
          severity: di.severity === 'critical' ? 'critical' : di.severity === 'warning' ? 'warning' : 'caution',
          icon: '💊', category: 'drug-interaction',
        });
      }
    }
  }

  const order = { critical: 0, warning: 1, caution: 2, info: 3 };
  warnings.sort((a, b) => order[a.severity] - order[b.severity]);
  return warnings;
}

function getSeverityColor(s: ExtractedWarning['severity']): string {
  switch (s) {
    case 'critical': return '#991b1b';
    case 'warning': return '#9a3412';
    case 'caution': return '#854d0e';
    case 'info': return '#1e40af';
  }
}
function getSeverityBg(s: ExtractedWarning['severity']): string {
  switch (s) {
    case 'critical': return '#fef2f2';
    case 'warning': return '#fff7ed';
    case 'caution': return '#fefce8';
    case 'info': return '#eff6ff';
  }
}
function getSeverityBorder(s: ExtractedWarning['severity']): string {
  switch (s) {
    case 'critical': return '#fecaca';
    case 'warning': return '#fed7aa';
    case 'caution': return '#fde047';
    case 'info': return '#bfdbfe';
  }
}

// ============================================================================
// HTML GENERATION
// ============================================================================

function escapeHtml(u: string): string {
  return u.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function pt(mm: number, scale: number): string {
  return `${(mm * 2.835 * scale).toFixed(2)}pt`;
}

function mmCss(mm: number, scale: number): string {
  return `${(mm * scale).toFixed(2)}mm`;
}

export interface GenerateLabelResult {
  html: string;
  printDimensions: { width: string; height: string };
  sizeConfig: {
    bottleSize: number;
    maxOils: number;
    oilsShown: number;
    warningsShown: number;
    needsQrFallback: boolean;
  };
}

export async function generateLabelHtml(data: LabelData): Promise<GenerateLabelResult> {
  const config = getSizeConfig(data.size);
  const s = config.fontScale;
  const w = config.widthMm;
  const h = config.heightMm;

  const extracted = extractOilWarnings(data.oils);
  const allWarnings: ExtractedWarning[] = [...extracted];
  for (const wText of data.warnings) {
    if (!allWarnings.some(ew => ew.text === wText)) {
      allWarnings.push({ text: wText, severity: 'warning', icon: '⚠️', category: 'general' });
    }
  }
  if (allWarnings.length === 0) {
    allWarnings.push(
      { text: 'External use only', severity: 'info', icon: '📌', category: 'general' },
      { text: 'Do not ingest', severity: 'info', icon: '📌', category: 'general' },
      { text: 'Keep from children', severity: 'info', icon: '📌', category: 'general' },
    );
  }

  // Smart space management
  const needsQrFallback = data.oils.length > config.maxOils || allWarnings.length > config.maxWarnings;
  const oilsToShow = needsQrFallback ? Math.min(3, data.oils.length) : data.oils.length;
  const warningsToShow = needsQrFallback
    ? allWarnings.filter(w => w.severity === 'critical').slice(0, 2)
    : allWarnings.slice(0, config.maxWarnings);

  const hiddenOils = data.oils.length - oilsToShow;
  const hiddenWarnings = allWarnings.length - warningsToShow.length;

  // Panel widths
  const frontWidth = w * 0.38;
  const backWidth = w * 0.62;

  // Build oil rows
  const oilRows = data.oils.slice(0, oilsToShow).map(o => `
    <tr>
      <td class="oil-name">${escapeHtml(o.name)}</td>
      <td class="oil-amt">${o.ml.toFixed(1)}ml</td>
      <td class="oil-pct">${o.percentage.toFixed(1)}%</td>
    </tr>
  `).join('');

  const carrierName = getCarrierOilName(data.carrierOil);
  const carrierRow = carrierName ? `
    <tr class="carrier-row">
      <td class="oil-name">${escapeHtml(carrierName)}</td>
      <td class="oil-amt">carrier</td>
      <td class="oil-pct">${(data.carrierPercentage || 0).toFixed(0)}%</td>
    </tr>
  ` : '';

  // Warning badges
  const warningHtml = warningsToShow.map(w => `
    <div class="w-badge" style="background:${getSeverityBg(w.severity)};color:${getSeverityColor(w.severity)};border:0.3px solid ${getSeverityBorder(w.severity)};">
      <span class="w-icon">${w.icon}</span><span class="w-text">${escapeHtml(w.text)}</span>
    </div>
  `).join('');

  // QR code (locally generated)
  const batchUrl = `https://oilamor.com/batch/${encodeURIComponent(data.batchId)}`;
  const qrSizePx = Math.round(config.qrSizeMm * 3.78 * (needsQrFallback ? 1.4 : 1));
  const qrImg = await generateQRCodeDataUrl(batchUrl, qrSizePx);

  // Refill banner
  const refillBanner = data.isRefill ? `
    <div class="refill-banner">
      <span class="refill-icon">🔁</span>
      <span class="refill-text">Forever Bottle Refill</span>
    </div>
    <div class="refill-sub">Original ${data.sourceVolume || 30}ml blend • Same ratio • Scaled to ${data.size}ml</div>
  ` : '';

  // Crystal
  const crystalHtml = data.crystal ? `<div class="crystal">💎 ${escapeHtml(data.crystal)}</div>` : '';

  // Intended use
  const useHtml = data.intendedUse ? `<div class="use-tag">${escapeHtml(data.intendedUse)}</div>` : '';

  // Hidden content note
  const hiddenNote = needsQrFallback ? `
    <div class="hidden-note">
      ${hiddenOils > 0 ? `+${hiddenOils} more oils ` : ''}
      ${hiddenWarnings > 0 ? `+${hiddenWarnings} more warnings ` : ''}
      — scan QR for complete info
    </div>
  ` : '';

  const embeddedFonts = buildEmbeddedFonts();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.blendName)}</title>
  <style>
    ${embeddedFonts}
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      width: ${w}mm; height: ${h}mm;
      font-family: 'Inter', sans-serif;
      background: #fff; color: #1a1a1a;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      overflow: hidden;
    }
    .wrap {
      display: flex; width: 100%; height: 100%;
    }

    /* ===== FRONT PANEL ===== */
    .front {
      width: ${frontWidth.toFixed(1)}mm; height: 100%;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: ${mmCss(1.5, s)};
      border-right: 0.4px solid #e5e5e5;
      position: relative;
    }
    .front-logo {
      font-family: 'Cormorant Garamond', serif;
      font-size: ${pt(3.2, s)}; font-weight: 700;
      letter-spacing: ${pt(0.3, s)};
      color: #c9a227; text-transform: uppercase;
    }
    .front-tagline {
      font-size: ${pt(1.3, s)}; color: #a69b8a;
      letter-spacing: ${pt(0.08, s)};
      margin-top: ${mmCss(0.3, s)};
    }
    .front-divider {
      width: 60%; height: 0.4px; background: #c9a227;
      margin: ${mmCss(1, s)} 0;
    }
    .front-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: ${pt(3.8, s)}; font-weight: 700;
      color: #0a080c; text-align: center;
      line-height: 1.15;
    }
    .front-type {
      font-size: ${pt(1.5, s)}; color: #666;
      font-style: italic; margin-top: ${mmCss(0.4, s)};
    }
    .front-size {
      font-size: ${pt(2, s)}; font-weight: 600;
      color: #c9a227; margin-top: ${mmCss(0.5, s)};
    }
    .use-tag {
      font-size: ${pt(1.2, s)}; color: #c9a227;
      text-transform: uppercase; letter-spacing: ${pt(0.1, s)};
      margin-top: ${mmCss(0.6, s)};
      padding: ${mmCss(0.3, s)} ${mmCss(1, s)};
      border: 0.3px solid #c9a227; border-radius: ${mmCss(0.5, s)};
    }
    .crystal {
      font-size: ${pt(1.4, s)}; color: #6b5b4e;
      font-style: italic; margin-top: ${mmCss(0.5, s)};
    }
    .refill-banner {
      display: flex; align-items: center; gap: ${mmCss(0.5, s)};
      margin-top: ${mmCss(0.8, s)};
      padding: ${mmCss(0.3, s)} ${mmCss(1, s)};
      background: #fefce8; border: 0.3px solid #fde047;
      border-radius: ${mmCss(0.5, s)};
    }
    .refill-icon { font-size: ${pt(1.6, s)}; }
    .refill-text {
      font-size: ${pt(1.1, s)}; font-weight: 600;
      color: #854d0e; text-transform: uppercase;
      letter-spacing: ${pt(0.05, s)};
    }
    .refill-sub {
      font-size: ${pt(1, s)}; color: #a69b8a;
      margin-top: ${mmCss(0.3, s)}; text-align: center;
    }
    .front-footer {
      position: absolute; bottom: ${mmCss(1, s)};
      font-size: ${pt(1, s)}; color: #bbb;
      letter-spacing: ${pt(0.05, s)};
    }

    /* ===== BACK PANEL ===== */
    .back {
      width: ${backWidth.toFixed(1)}mm; height: 100%;
      display: flex; flex-direction: column;
      padding: ${mmCss(1.5, s)} ${mmCss(2, s)};
    }
    .back-header {
      font-size: ${pt(1.4, s)}; font-weight: 600;
      color: #888; text-transform: uppercase;
      letter-spacing: ${pt(0.1, s)};
      margin-bottom: ${mmCss(0.8, s)};
      border-bottom: 0.3px solid #ddd;
      padding-bottom: ${mmCss(0.5, s)};
    }

    /* Ingredients Table */
    .ing-table { width: 100%; border-collapse: collapse; font-size: ${pt(1.5, s)}; }
    .ing-table thead th {
      text-align: left; font-weight: 600; font-size: ${pt(1.2, s)};
      color: #999; text-transform: uppercase; letter-spacing: ${pt(0.04, s)};
      padding: ${mmCss(0.4, s)} ${mmCss(0.4, s)} ${mmCss(0.4, s)} 0;
      border-bottom: 0.3px solid #ddd;
    }
    .ing-table thead th:last-child { text-align: right; }
    .ing-table thead th:nth-child(2) { text-align: right; }
    .ing-table tbody td {
      padding: ${mmCss(0.35, s)} ${mmCss(0.4, s)} ${mmCss(0.35, s)} 0;
      border-bottom: 0.2px solid #f0f0f0;
      vertical-align: top;
    }
    .ing-table tbody td:last-child { text-align: right; }
    .ing-table tbody td:nth-child(2) { text-align: right; }
    .oil-name { color: #1a1a1a; font-weight: 500; }
    .oil-amt { color: #555; font-size: ${pt(1.35, s)}; font-variant-numeric: tabular-nums; }
    .oil-pct { color: #c9a227; font-weight: 600; font-size: ${pt(1.4, s)}; }
    .carrier-row .oil-name { color: #666; font-style: italic; }
    .carrier-row .oil-pct { color: #888; }
    .total-row td {
      border-top: 0.5px solid #c9a227; border-bottom: none;
      padding-top: ${mmCss(0.5, s)}; font-weight: 600; color: #0a080c;
    }

    /* Warnings */
    .warnings-section { margin-top: ${mmCss(1, s)}; }
    .w-badge {
      display: flex; align-items: flex-start; gap: ${mmCss(0.4, s)};
      padding: ${mmCss(0.4, s)} ${mmCss(0.8, s)};
      border-radius: ${mmCss(0.4, s)}; margin-bottom: ${mmCss(0.4, s)};
      font-size: ${pt(1.25, s)}; line-height: 1.3;
    }
    .w-icon { flex-shrink: 0; font-size: ${pt(1.4, s)}; margin-top: 0.1mm; }
    .w-text { flex: 1; }
    .hidden-note {
      font-size: ${pt(1.1, s)}; color: #999;
      font-style: italic; text-align: center;
      margin-top: ${mmCss(0.3, s)};
    }

    /* QR + Batch footer */
    .back-footer {
      margin-top: auto;
      display: flex; align-items: center; gap: ${mmCss(1.5, s)};
      padding-top: ${mmCss(1, s)};
      border-top: 0.3px solid #eee;
    }
    .qr-wrap { flex-shrink: 0; }
    .qr-wrap img {
      width: ${config.qrSizeMm * (needsQrFallback ? 1.4 : 1)}mm;
      height: ${config.qrSizeMm * (needsQrFallback ? 1.4 : 1)}mm;
      object-fit: contain;
    }
    .batch-info { flex: 1; }
    .batch-label { font-size: ${pt(1.1, s)}; color: #999; text-transform: uppercase; letter-spacing: ${pt(0.05, s)}; }
    .batch-id {
      font-family: 'Cormorant Garamond', serif;
      font-size: ${pt(1.8, s)}; font-weight: 600; color: #0a080c;
    }
    .batch-dates {
      font-size: ${pt(1.1, s)}; color: #999;
      margin-top: ${mmCss(0.2, s)};
    }
    .qr-hint {
      font-size: ${pt(1, s)}; color: #bbb;
      margin-top: ${mmCss(0.2, s)};
    }
    .qr-fallback {
      font-size: ${pt(0.9, s)}; color: #bbb;
      margin-top: ${mmCss(0.1, s)};
      font-style: italic;
    }

    @media print {
      body { width: ${w}mm; height: ${h}mm; margin: 0; padding: 0; }
      @page { size: ${w}mm ${h}mm; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <!-- FRONT PANEL -->
    <div class="front">
      <div class="front-logo">Oil Amor</div>
      <div class="front-tagline">Handcrafted</div>
      <div class="front-divider"></div>
      <div class="front-name">${escapeHtml(data.blendName)}</div>
      <div class="front-type">${carrierName ? 'Carrier Dilution' : 'Pure Essential Oil Blend'}</div>
      <div class="front-size">${data.size}ml</div>
      ${useHtml}
      ${crystalHtml}
      ${refillBanner}
      <div class="front-footer">oilamor.com</div>
    </div>

    <!-- BACK PANEL -->
    <div class="back">
      <div class="back-header">Ingredients & Safety</div>

      <table class="ing-table">
        <thead>
          <tr><th>Ingredient</th><th>Amt</th><th>%</th></tr>
        </thead>
        <tbody>
          ${oilRows}
          ${carrierRow}
          <tr class="total-row">
            <td>Total</td>
            <td>${data.size}ml</td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>

      <div class="warnings-section">
        ${warningHtml}
        ${hiddenNote}
      </div>

      <div class="back-footer">
        <div class="qr-wrap">
          <img src="${qrImg}" alt="QR">
        </div>
        <div class="batch-info">
          <div class="batch-label">Batch</div>
          <div class="batch-id">${escapeHtml(data.batchId)}</div>
          <div class="batch-dates">Made ${escapeHtml(data.madeDate)} • Exp ${escapeHtml(data.expiryDate)}</div>
          <div class="qr-hint">Scan for full recipe &amp; safety</div>
          <div class="qr-fallback">oilamor.com/batch/${escapeHtml(data.batchId)}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    html,
    printDimensions: {
      width: `${config.widthMm}mm`,
      height: `${config.heightMm}mm`,
    },
    sizeConfig: {
      bottleSize: data.size,
      maxOils: config.maxOils,
      oilsShown: needsQrFallback ? Math.min(3, data.oils.length) : data.oils.length,
      warningsShown: needsQrFallback
        ? allWarnings.filter(w => w.severity === 'critical').slice(0, 2).length
        : Math.min(allWarnings.length, config.maxWarnings),
      needsQrFallback: needsQrFallback,
    },
  };
}
