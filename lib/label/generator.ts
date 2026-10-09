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
import { ATELIER_OILS, ATELIER_CRYSTALS } from '@/lib/atelier/atelier-engine';
import { BUSINESS } from '@/lib/site-config';

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

/**
 * MIRON Orion DIN18 bottle geometry — verified against miron.com product
 * specifications (2026-10-09). The label is ONE continuous wrap strip:
 *   width  = circumference − OVERLAP_GAP_MM, so the strip's edges meet on the
 *            bottle leaving an 8mm viewing gap for the front panel
 *   height ≈ a third of the bottle height, clear of the shoulder curve
 * Printed output must match these dimensions exactly at 100% scale.
 */
export const OVERLAP_GAP_MM = 8;
export const BOTTLE_GEOMETRY: Record<
  number,
  { diameterMm: number; bottleHeightMm: number; labelHeightMm: number }
> = {
  5:   { diameterMm: 22.5, bottleHeightMm: 53.2,  labelHeightMm: 22 },
  10:  { diameterMm: 24.8, bottleHeightMm: 63.6,  labelHeightMm: 22 },
  15:  { diameterMm: 29.0, bottleHeightMm: 70.5,  labelHeightMm: 25 },
  20:  { diameterMm: 30.5, bottleHeightMm: 72.5,  labelHeightMm: 26 },
  30:  { diameterMm: 34.0, bottleHeightMm: 79.4,  labelHeightMm: 30 },
  50:  { diameterMm: 37.2, bottleHeightMm: 92.2,  labelHeightMm: 34 },
  100: { diameterMm: 44.5, bottleHeightMm: 112.0, labelHeightMm: 40 },
};

function wrapWidthMm(size: number): number {
  const g = BOTTLE_GEOMETRY[size];
  if (!g) return 80;
  return Math.round(Math.PI * g.diameterMm) - OVERLAP_GAP_MM;
}

export const SIZE_CONFIGS: Record<number, LabelSizeConfig> = {
  5:   { widthMm: wrapWidthMm(5),   heightMm: BOTTLE_GEOMETRY[5].labelHeightMm,   maxOils: 3,  maxWarnings: 2, fontScale: 0.72, qrSizeMm: 8,  isRefill: false },
  10:  { widthMm: wrapWidthMm(10),  heightMm: BOTTLE_GEOMETRY[10].labelHeightMm,  maxOils: 4,  maxWarnings: 2, fontScale: 0.78, qrSizeMm: 9, isRefill: false },
  15:  { widthMm: wrapWidthMm(15),  heightMm: BOTTLE_GEOMETRY[15].labelHeightMm,  maxOils: 5,  maxWarnings: 2, fontScale: 0.85, qrSizeMm: 10, isRefill: false },
  20:  { widthMm: wrapWidthMm(20),  heightMm: BOTTLE_GEOMETRY[20].labelHeightMm,  maxOils: 6,  maxWarnings: 2, fontScale: 0.92, qrSizeMm: 11, isRefill: false },
  30:  { widthMm: wrapWidthMm(30),  heightMm: BOTTLE_GEOMETRY[30].labelHeightMm,  maxOils: 8,  maxWarnings: 2, fontScale: 1.00, qrSizeMm: 11, isRefill: false },
  50:  { widthMm: wrapWidthMm(50),  heightMm: BOTTLE_GEOMETRY[50].labelHeightMm,  maxOils: 10, maxWarnings: 2, fontScale: 1.12, qrSizeMm: 13, isRefill: true },
  100: { widthMm: wrapWidthMm(100), heightMm: BOTTLE_GEOMETRY[100].labelHeightMm, maxOils: 12, maxWarnings: 2, fontScale: 1.25, qrSizeMm: 15, isRefill: true },
};

export function getSizeConfig(size: number): LabelSizeConfig {
  return SIZE_CONFIGS[size] || SIZE_CONFIGS[30];
}

// ============================================================================
// THEME & COLOR HELPERS
// ============================================================================

const INTENDED_USE_THEMES: Record<string, string> = {
  sleep: '#7c6fae',
  energy: '#e8923c',
  focus: '#4a9b8e',
  calming: '#7b9dc2',
  grounding: '#8b7355',
  uplifting: '#c9a227',
  relaxation: '#b8a0d9',
};

// Display strings for the front label. Ids stay stable; the wording is
// ritual/aromatic framing to avoid therapeutic (TGA-regulated) claims.
const INTENDED_USE_LABELS: Record<string, string> = {
  sleep: 'Evening ritual',
  energy: 'Morning ritual',
  focus: 'Focus ritual',
  calming: 'Calm ritual',
  grounding: 'Grounding ritual',
  uplifting: 'Uplifting ritual',
  relaxation: 'Unwinding ritual',
};

const RARITY_ORDER = { common: 0, premium: 1, luxury: 2 };

export function getOilColor(oilId: string): string | undefined {
  const oil = ATELIER_OILS.find(o => o.id === oilId);
  return oil?.color;
}

export function getIntendedUseTheme(intendedUse?: string): string | undefined {
  if (!intendedUse) return undefined;
  return INTENDED_USE_THEMES[intendedUse.toLowerCase()];
}

export function getCrystalColor(crystalId?: string): string | undefined {
  if (!crystalId) return undefined;
  const crystal = ATELIER_CRYSTALS.find(c => c.id === crystalId);
  return crystal?.color;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

export function lightenForLabel(hex: string, amount: number = 0.15): string {
  const { r, g, b } = hexToRgb(hex);
  const newR = r + (255 - r) * amount;
  const newG = g + (255 - g) * amount;
  const newB = b + (255 - b) * amount;
  return rgbToHex(newR, newG, newB);
}

export function getDominantRarity(oils: LabelOil[]): 'common' | 'premium' | 'luxury' | undefined {
  let maxRarity = -1;
  for (const oil of oils) {
    if (!oil.oilId) continue;
    const atelierOil = ATELIER_OILS.find(o => o.id === oil.oilId);
    if (!atelierOil) continue;
    const order = RARITY_ORDER[atelierOil.rarity];
    if (order > maxRarity) maxRarity = order;
  }
  if (maxRarity === -1) return undefined;
  const entries = Object.entries(RARITY_ORDER) as [string, number][];
  const found = entries.find(([, v]) => v === maxRarity);
  return found ? (found[0] as 'common' | 'premium' | 'luxury') : undefined;
}

export function deriveThemeColor(data: LabelData): string {
  if (data.isAtelier) {
    return '#b87333';
  }
  const intendedTheme = getIntendedUseTheme(data.intendedUse);
  if (intendedTheme) return intendedTheme;
  if (data.oils.length > 0) {
    const dominant = data.oils.reduce((max, o) => (o.ml > max.ml ? o : max), data.oils[0]);
    if (dominant.oilId) {
      const oilColor = getOilColor(dominant.oilId);
      if (oilColor) return lightenForLabel(oilColor, 0.1);
    }
  }
  return '#c9a227';
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
  // Styling data (v5 — oil-aware theming)
  mode?: 'pure' | 'carrier';
  isAtelier?: boolean;
  themeColor?: string;
  oilColors?: { oilId: string; color: string }[];
  dominantRarity?: 'common' | 'premium' | 'luxury';
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
// BRAND LOGO (base64 embedded for self-contained output)
// ============================================================================

let logoCache: string | null = null;

function getLogoBase64(): string {
  if (logoCache) return logoCache;
  const path = join(process.cwd(), 'public', 'images', 'logo', 'label-gold-emblem.png');
  logoCache = readFileSync(path).toString('base64');
  return logoCache;
}

// ============================================================================
// QR CODE GENERATION
// ============================================================================
//
// Branded QR: dark modules on white, error-correction level H, with the
// Oil Amor heart mark embedded in the center (H tolerates ~30% damage; the
// center overlay covers well under 10% of the area and never touches the
// corner finder patterns). Output is a self-contained SVG data URI.

const QR_HEART_PATH =
  'M50 84 C22 58 10 44 10 29 C10 16 20 8 31 8 C39 8 46 13 50 21 ' +
  'C54 13 61 8 69 8 C80 8 90 16 90 29 C90 44 78 58 50 84 Z';

export async function generateQRCodeDataUrl(
  url: string,
  size: number,
  themeColor: string = '#c9a227',
): Promise<string> {
  // Render the matrix ourselves: margin 0 at scale 4 gives exact module
  // geometry (root width = moduleCount * 4), which we then pad for the
  // quiet zone and center badge. (node-qrcode's `width` option produces
  // internally inconsistent SVG geometry, so it is intentionally avoided.)
  const MODULE_SCALE = 4;
  const QUIET_MODULES = 4;

  const qrSvg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 0,
    scale: MODULE_SCALE,
    color: {
      dark: '#0a080c',
      light: '#ffffff',
    },
  });

  const match = qrSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const sizeMatch = qrSvg.match(/viewBox="0 0 (\d+)[\s"]/);
  if (!match || !sizeMatch) {
    // Fallback: plain QR without branding if SVG output is unexpected
    return QRCode.toDataURL(url, { width: size, margin: 1 });
  }

  const matrixSize = parseInt(sizeMatch[1], 10);
  const pad = QUIET_MODULES;
  const total = matrixSize + pad * 2;

  const r = total * 0.14; // center badge radius (28% of width incl. padding)
  const c = total / 2;

  const branded = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="#ffffff"/><g transform="translate(${pad},${pad})">${match[1]}</g><g><rect x="${(c - r * 1.15).toFixed(2)}" y="${(c - r * 1.15).toFixed(2)}" width="${(r * 2.3).toFixed(2)}" height="${(r * 2.3).toFixed(2)}" rx="${(r * 0.35).toFixed(2)}" fill="#ffffff"/><svg x="${(c - r).toFixed(2)}" y="${(c - r * 0.96).toFixed(2)}" width="${(r * 2).toFixed(2)}" height="${(r * 1.92).toFixed(2)}" viewBox="0 0 100 100"><path d="${QR_HEART_PATH}" fill="${themeColor}"/></svg></g></svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(branded).toString('base64')}`;
}

/**
 * Email-safe QR: PNG with gold modules. Email clients cannot be trusted to
 * render SVG data URIs, so the branded heart badge is label-only; emails
 * get gold modules on white instead.
 */
export async function generateEmailQRDataUrl(
  url: string,
  size: number = 200,
  color: string = '#c9a227',
): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: color,
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
    case 'critical': return '#fca5a5';
    case 'warning': return '#fdba74';
    case 'caution': return '#fde047';
    case 'info': return '#93c5fd';
  }
}
function getSeverityBg(s: ExtractedWarning['severity']): string {
  // translucent fills so the dark label surface shows through
  switch (s) {
    case 'critical': return 'rgba(220,38,38,0.14)';
    case 'warning': return 'rgba(234,88,12,0.14)';
    case 'caution': return 'rgba(202,138,4,0.14)';
    case 'info': return 'rgba(37,99,235,0.14)';
  }
}
function getSeverityBorder(s: ExtractedWarning['severity']): string {
  switch (s) {
    case 'critical': return 'rgba(248,113,113,0.55)';
    case 'warning': return 'rgba(251,146,60,0.5)';
    case 'caution': return 'rgba(253,224,71,0.45)';
    case 'info': return 'rgba(96,165,250,0.5)';
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

  const themeColor = data.themeColor || deriveThemeColor(data);
  const crystalColor = getCrystalColor(data.crystal) || themeColor;
  const isAtelier = data.isAtelier || false;
  const rarity = data.dominantRarity || getDominantRarity(data.oils);

  const extracted = extractOilWarnings(data.oils);
  const allWarnings: ExtractedWarning[] = [...extracted];
  for (const wText of data.warnings) {
    if (!allWarnings.some(ew => ew.text === wText)) {
      allWarnings.push({ text: wText, severity: 'warning', icon: '⚠️', category: 'general' });
    }
  }

  // Standing warnings always print on the back panel, regardless of dynamic warnings.
  const STANDING_WARNINGS = ['External use only', 'Do not ingest', 'Keep out of reach of children'];

  // Physical space on a bottle label is fixed — the QR code is what carries
  // the full safety profile. Print at most 2 warnings, most severe first
  // (extractOilWarnings returns severity-sorted), and point to the QR for the
  // rest. Never more: ten warning badges will never fit on 18–40mm of label.
  const MAX_PRINTED_WARNINGS = 2;
  const needsQrFallback = data.oils.length > config.maxOils || allWarnings.length > MAX_PRINTED_WARNINGS;
  const oilsToShow = needsQrFallback ? Math.min(3, data.oils.length) : data.oils.length;
  const warningsToShow = allWarnings.slice(0, MAX_PRINTED_WARNINGS);

  const hiddenOils = data.oils.length - oilsToShow;
  const hiddenWarnings = allWarnings.length - warningsToShow.length;

  // Panel widths
  const frontWidth = w * 0.38;
  const backWidth = w * 0.62;

  // Build oil rows
  const oilRows = data.oils.slice(0, oilsToShow).map(o => {
    const oilColor = o.oilId ? getOilColor(o.oilId) : undefined;
    const dotHtml = oilColor
      ? `<span class="oil-dot" style="background:${oilColor}"></span>`
      : '<span class="oil-dot oil-dot--unknown"></span>';
    return `
    <tr>
      <td class="oil-name">${dotHtml}${escapeHtml(o.name)}</td>
      <td class="oil-amt">${o.ml.toFixed(1)}ml</td>
      <td class="oil-pct">${o.percentage.toFixed(1)}%</td>
    </tr>
  `;
  }).join('');

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

  // Standing warnings (always printed, never gated or truncated)
  const standingHtml = `
    <div class="standing-warnings">
      ${STANDING_WARNINGS.map(t => `<span class="sw-item">${escapeHtml(t)}</span>`).join('<span class="sw-dot">◆</span>')}
    </div>
  `;

  // Manufacturer / country of origin (Australian labelling compliance)
  const manufacturerHtml = `
    <div class="manufacturer">
      <div class="mfg-line mfg-primary">Made in Australia by <strong>${escapeHtml(BUSINESS.name)}</strong></div>
      <div class="mfg-line">${escapeHtml(BUSINESS.address)}</div>
      ${BUSINESS.abn ? `<div class="mfg-line">ABN ${escapeHtml(BUSINESS.abn)}</div>` : ''}
    </div>
  `;

  // Directions, first aid / Poisons line, and storage (always printed)
  const complianceHtml = `
    <div class="label-compliance">
      <div class="lc-line"><span class="lc-label">Directions:</span> For aromatic use. Dilute with a carrier oil before topical application. Not for internal use.</div>
      <div class="lc-line"><span class="lc-label">If swallowed or a reaction occurs:</span> contact the Poisons Information Centre on 13 11 26.</div>
      <div class="lc-line"><span class="lc-label">Storage:</span> Store below 30°C, away from direct sunlight.</div>
    </div>
  `;

  // QR code (locally generated) — raster generated at ~300dpi so it stays
  // crisp in print at its fixed physical size
  const batchUrl = `https://oilamor.com/batch/${encodeURIComponent(data.batchId)}`;
  const qrSizePx = Math.round(config.qrSizeMm * 11.81);
  const qrImg = await generateQRCodeDataUrl(batchUrl, qrSizePx, themeColor);

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

  // Intended use — display the ritual/aromatic label, not the raw id
  const intendedUseLabel = data.intendedUse
    ? (INTENDED_USE_LABELS[data.intendedUse.toLowerCase()] || data.intendedUse)
    : undefined;
  const useHtml = intendedUseLabel ? `<div class="use-tag">${escapeHtml(intendedUseLabel)}</div>` : '';

  // Atelier badge
  const atelierBadge = isAtelier ? `
    <div class="atelier-badge">
      <span class="atelier-icon">⚗️</span>
      <span class="atelier-text">${s < 0.85 ? 'Atelier' : 'Atelier Crafted'}</span>
    </div>
  ` : '';

  // Rarity indicator
  const rarityHtml = rarity && rarity !== 'common' ? `
    <div class="rarity-indicator">
      ${rarity === 'luxury' ? '♛' : '★'} ${rarity === 'luxury' ? 'Luxury Blend' : 'Premium Blend'}
    </div>
  ` : '';

  // Hidden content note
  const hiddenNote = needsQrFallback ? `
    <div class="hidden-note">
      ${hiddenOils > 0 ? `+${hiddenOils} more oils ` : ''}
      ${hiddenWarnings > 0 ? `+${hiddenWarnings} more warnings ` : ''}
      — scan QR for complete info
    </div>
  ` : '';

  const embeddedFonts = buildEmbeddedFonts();
  const logoSrc = `data:image/png;base64,${getLogoBase64()}`;
  const geo = BOTTLE_GEOMETRY[data.size] ?? BOTTLE_GEOMETRY[30];
  const circMm = (Math.PI * geo.diameterMm).toFixed(1);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.blendName)}</title>
  <style>
    ${embeddedFonts}
    * { margin:0; padding:0; box-sizing:border-box; }
    html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body {
      font-family:'Inter', sans-serif;
      background:#26222b;
      display:flex; justify-content:center;
      padding:10mm 0;
    }
    /* One A4 sheet per label, true mm scale, both wrap segments together */
    .sheet { width:190mm; }
    .spec {
      font-size:6.5pt; color:#8f8a96; letter-spacing:0.04em;
      padding-bottom:2mm; font-variant-numeric:tabular-nums;
    }
    .spec strong { color:#c9a227; font-weight:600; }
    .stage { position:relative; padding:4mm; }
    .cm { position:absolute; width:4mm; height:4mm; }
    .cm.tl { top:0; left:0; border-top:0.3mm solid #8f8a96; border-left:0.3mm solid #8f8a96; }
    .cm.tr { top:0; right:0; border-top:0.3mm solid #8f8a96; border-right:0.3mm solid #8f8a96; }
    .cm.bl { bottom:0; left:0; border-bottom:0.3mm solid #8f8a96; border-left:0.3mm solid #8f8a96; }
    .cm.br { bottom:0; right:0; border-bottom:0.3mm solid #8f8a96; border-right:0.3mm solid #8f8a96; }
    .print-note {
      margin-top:2mm; font-size:6pt; color:#6e6a76; letter-spacing:0.05em;
      text-transform:uppercase;
    }
    /* The label itself — one continuous wrap, Oil Amor dark theme */
    .label {
      display:flex;
      width:${w}mm; height:${h}mm;
      background:#0d0a13;
      border:0.2mm solid rgba(201,162,39,0.45);
      border-radius:0.8mm;
      overflow:hidden;
      box-shadow:0 2mm 6mm rgba(0,0,0,0.45);
    }

    /* ===== FRONT PANEL ===== */
    .front {
      width:${frontWidth.toFixed(1)}mm; height:100%;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      padding:${mmCss(1, s)};
      border-right:0.2mm solid rgba(201,162,39,0.35);
      position:relative;
      background:radial-gradient(circle at 50% 30%, rgba(201,162,39,0.10) 0%, transparent 65%), #0d0a13;
    }
    .front-logo {
      height:${pt(7.5, s)};
      object-fit:contain;
    }
    .front-divider {
      width:55%; height:0.2mm; background:${crystalColor};
      opacity:0.7;
      margin:${mmCss(0.8, s)} 0;
    }
    .front-name {
      font-family:'Cormorant Garamond', serif;
      font-size:${pt(3.8, s)}; font-weight:700;
      color:#f5f3ef; text-align:center;
      line-height:1.12;
    }
    .front-type {
      font-size:${pt(1.4, s)}; color:#a69b8a;
      font-style:italic; margin-top:${mmCss(0.3, s)};
    }
    .front-size {
      font-family:'Cormorant Garamond', serif;
      font-size:${pt(2.2, s)}; font-weight:600;
      color:${themeColor}; margin-top:${mmCss(0.4, s)};
    }
    .use-tag {
      font-size:${pt(1.2, s)}; color:${themeColor};
      text-transform:uppercase; letter-spacing:${pt(0.1, s)};
      margin-top:${mmCss(0.5, s)};
      padding:${mmCss(0.25, s)} ${mmCss(0.9, s)};
      border:0.2mm solid ${themeColor}; border-radius:${mmCss(2, s)};
    }
    .crystal {
      font-size:${pt(1.3, s)}; color:#a69b8a;
      font-style:italic; margin-top:${mmCss(0.4, s)};
    }
    .refill-banner {
      display:flex; align-items:center; gap:${mmCss(0.5, s)};
      margin-top:${mmCss(0.6, s)};
      padding:${mmCss(0.25, s)} ${mmCss(0.9, s)};
      background:rgba(253,224,71,0.10); border:0.2mm solid rgba(253,224,71,0.45);
      border-radius:${mmCss(2, s)};
    }
    .refill-icon { font-size:${pt(1.5, s)}; }
    .refill-text {
      font-size:${pt(1, s)}; font-weight:600;
      color:#fde047; text-transform:uppercase;
      letter-spacing:${pt(0.05, s)};
    }
    .refill-sub {
      font-size:${pt(0.95, s)}; color:#a69b8a;
      margin-top:${mmCss(0.25, s)}; text-align:center;
    }
    .atelier-badge {
      display:flex; align-items:center; gap:${mmCss(0.4, s)};
      margin-top:${mmCss(0.5, s)};
      padding:${mmCss(0.25, s)} ${mmCss(0.9, s)};
      background:rgba(201,162,39,0.12);
      border:0.2mm solid rgba(201,162,39,0.45);
      border-radius:${mmCss(2, s)};
    }
    .atelier-icon { font-size:${pt(1.3, s)}; }
    .atelier-text {
      font-family:'Cormorant Garamond', serif;
      font-size:${pt(1.2, s)}; font-weight:600;
      color:${themeColor}; text-transform:uppercase;
      letter-spacing:${pt(0.08, s)};
    }
    .front-footer {
      position:absolute; bottom:${mmCss(0.8, s)};
      font-size:${pt(0.95, s)}; color:rgba(201,162,39,0.75);
      letter-spacing:${pt(0.06, s)};
    }

    /* ===== BACK PANEL — two columns so the strip stays bottle-height ===== */
    .back {
      width:${backWidth.toFixed(1)}mm; height:100%;
      display:flex; flex-direction:column;
      padding:${mmCss(1, s)} ${mmCss(1.4, s)};
      color:#e8e4dc;
    }
    .back-header {
      font-size:${pt(1.2, s)}; font-weight:600;
      color:#a69b8a; text-transform:uppercase;
      letter-spacing:${pt(0.09, s)};
      margin-bottom:${mmCss(0.5, s)};
      border-bottom:0.2mm solid rgba(201,162,39,0.35);
      padding-bottom:${mmCss(0.3, s)};
    }
    .back-body {
      display:flex; gap:${mmCss(1.2, s)};
      flex:1; min-height:0;
    }
    .col-left {
      width:56%;
      display:flex; flex-direction:column;
      min-height:0;
    }
    .col-right {
      width:44%;
      display:flex; flex-direction:column;
      border-left:0.15mm solid rgba(201,162,39,0.25);
      padding-left:${mmCss(1.2, s)};
      min-height:0;
    }

    /* Ingredients Table */
    .ing-table { width:100%; border-collapse:collapse; font-size:${pt(1.4, s)}; }
    .ing-table thead th {
      text-align:left; font-weight:600; font-size:${pt(1.0, s)};
      color:#8f8a96; text-transform:uppercase; letter-spacing:${pt(0.03, s)};
      padding:0 ${mmCss(0.3, s)} ${mmCss(0.2, s)} 0;
      border-bottom:0.2mm solid rgba(245,243,239,0.18);
    }
    .ing-table thead th:last-child { text-align:right; }
    .ing-table thead th:nth-child(2) { text-align:right; }
    .ing-table tbody td {
      padding:${mmCss(0.2, s)} ${mmCss(0.3, s)} ${mmCss(0.2, s)} 0;
      border-bottom:0.15mm solid rgba(245,243,239,0.07);
      vertical-align:top;
    }
    .ing-table tbody td:last-child { text-align:right; }
    .ing-table tbody td:nth-child(2) { text-align:right; }
    .oil-name { color:#f5f3ef; font-weight:500; }
    .oil-dot {
      display: inline-block;
      width: ${mmCss(1.2, s)};
      height: ${mmCss(1.2, s)};
      border-radius: 50%;
      margin-right: ${mmCss(0.5, s)};
      vertical-align: middle;
      flex-shrink: 0;
    }
    .oil-dot--unknown { background:#3a3644; }
    .oil-amt { color:#a69b8a; font-size:${pt(1.35, s)}; font-variant-numeric:tabular-nums; }
    .oil-pct { color:${themeColor}; font-weight:600; font-size:${pt(1.4, s)}; }
    .carrier-row .oil-name { color:#a69b8a; font-style:italic; }
    .carrier-row .oil-pct { color:#8f8a96; }
    .total-row td {
      border-top:0.2mm solid ${themeColor}; border-bottom:none;
      padding-top:${mmCss(0.4, s)}; font-weight:600; color:#f5f3ef;
    }

    /* Warnings */
    .warnings-section { margin-top:${mmCss(0.5, s)}; }
    .w-badge {
      display:flex; align-items:flex-start; gap:${mmCss(0.35, s)};
      padding:${mmCss(0.25, s)} ${mmCss(0.6, s)};
      border-radius:${mmCss(0.35, s)}; margin-bottom:${mmCss(0.3, s)};
      font-size:${pt(1.1, s)}; line-height:1.25;
    }
    .w-icon { flex-shrink:0; font-size:${pt(1.35, s)}; margin-top:0.1mm; }
    .w-text { flex:1; }
    .standing-warnings {
      display:flex; align-items:center; justify-content:center;
      flex-wrap:wrap; gap:${mmCss(0.4, s)};
      margin-top:auto;
      padding-top:${mmCss(0.3, s)};
      border-top:0.15mm solid rgba(201,162,39,0.3);
      font-size:${pt(1.0, s)}; font-weight:600;
      color:#f5f3ef; letter-spacing:${pt(0.02, s)};
      text-align:center;
    }
    .sw-dot { color:${themeColor}; font-size:${pt(0.75, s)}; }
    .hidden-note {
      font-size:${pt(1.05, s)}; color:#8f8a96;
      font-style:italic; text-align:center;
      margin-top:${mmCss(0.25, s)};
    }

    /* Manufacturer + compliance (directions / first aid / storage) */
    .label-compliance {
      margin-top:${mmCss(0.35, s)};
      padding-top:${mmCss(0.4, s)};
      border-top:0.15mm solid rgba(201,162,39,0.3);
      font-size:${pt(1.0, s)}; line-height:1.32; color:#b9b3a8;
    }
    .lc-line { margin-bottom:${mmCss(0.12, s)}; }
    .lc-label { font-weight:600; color:${themeColor}; }
    .manufacturer {
      margin-top:${mmCss(0.35, s)};
      font-size:${pt(1.0, s)}; line-height:1.32; color:#a69b8a;
    }
    .mfg-primary { font-weight:600; color:#f5f3ef; }
    .manufacturer strong { color:${themeColor}; font-weight:700; }

    /* QR + Batch footer */
    .back-footer {
      margin-top:auto;
      display:flex; align-items:center; gap:${mmCss(1.2, s)};
      padding-top:${mmCss(0.4, s)};
      border-top:0.2mm solid rgba(245,243,239,0.12);
    }
    .qr-tile {
      flex-shrink:0;
      background:#fff;
      padding:${mmCss(0.6, s)};
      border-radius:${mmCss(0.5, s)};
      line-height:0;
    }
    .qr-tile img {
      width:${config.qrSizeMm}mm;
      height:${config.qrSizeMm}mm;
      object-fit:contain;
    }
    .batch-info { flex:1; }
    .batch-label { font-size:${pt(1.0, s)}; color:#8f8a96; text-transform:uppercase; letter-spacing:${pt(0.05, s)}; }
    .batch-id {
      font-family:'Cormorant Garamond', serif;
      font-size:${pt(1.7, s)}; font-weight:600; color:#f5f3ef;
    }
    .batch-dates {
      font-size:${pt(1.05, s)}; color:#a69b8a;
      margin-top:${mmCss(0.15, s)};
    }
    .qr-hint {
      font-size:${pt(0.95, s)}; color:#8f8a96;
      margin-top:${mmCss(0.15, s)};
    }
    .qr-fallback {
      font-size:${pt(0.85, s)}; color:#6e6a76;
      margin-top:${mmCss(0.1, s)};
      font-style:italic;
    }
    .rarity-indicator {
      font-size:${pt(1.05, s)};
      color:${rarity === 'luxury' ? '#c9a227' : '#8f8a96'};
      margin-top:${mmCss(0.25, s)};
      font-style:italic;
    }

    @media print {
      body { background:#fff; padding:8mm 0; display:block; }
      .label { box-shadow:none; }
      @page { size:A4 portrait; margin:0; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="spec">
      <strong>OIL AMOR</strong> — ${escapeHtml(data.blendName)} · ${data.size}ml ·
      wrap ${w} × ${h}mm · MIRON Orion Ø${geo.diameterMm}mm
      (C ${circMm}mm − ${OVERLAP_GAP_MM}mm gap) · Batch ${escapeHtml(data.batchId)}
    </div>
    <div class="stage">
      <span class="cm tl"></span><span class="cm tr"></span>
      <span class="cm bl"></span><span class="cm br"></span>
      <!-- ONE continuous wrap — front panel and back panel on a single strip.
           Cut on the crop marks; wrap so the two short edges meet with the
           8mm viewing gap over the front panel. -->
      <div class="label">
        <!-- FRONT PANEL -->
        <div class="front">
          <img class="front-logo" src="${logoSrc}" alt="Oil Amor">
          <div class="front-divider"></div>
          <div class="front-name">${escapeHtml(data.blendName)}</div>
          <div class="front-type">${carrierName ? 'Carrier Dilution' : 'Pure Essential Oil Blend'}</div>
          <div class="front-size">${data.size}ml</div>
          ${useHtml}
          ${crystalHtml}
          ${atelierBadge}
          ${refillBanner}
          <div class="front-footer">oilamor.com</div>
        </div>

        <!-- BACK PANEL -->
        <div class="back">
          <div class="back-header">Ingredients &amp; Safety</div>
          <div class="back-body">
            <div class="col-left">
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
              ${standingHtml}
            </div>
            <div class="col-right">
              ${complianceHtml}
              ${manufacturerHtml}
              <div class="back-footer">
                <div class="qr-tile">
                  <img src="${qrImg}" alt="QR">
                </div>
                <div class="batch-info">
                  ${h < 23 ? '' : '<div class="batch-label">Batch</div>'}
                  <div class="batch-id" ${h < 23 ? 'style="font-size:' + pt(1.5, s) + '"' : ''}>${escapeHtml(data.batchId)}</div>
                  <div class="batch-dates">Made ${escapeHtml(data.madeDate)} • Exp ${escapeHtml(data.expiryDate)}</div>
                  ${rarityHtml}
                  ${h < 23 ? '' : '<div class="qr-fallback">oilamor.com/batch/' + escapeHtml(data.batchId) + '</div>'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="print-note">Print at 100% scale — do not fit-to-page · cut on crop marks · edges meet with ${OVERLAP_GAP_MM}mm gap</div>
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
      warningsShown: warningsToShow.length,
      needsQrFallback: needsQrFallback,
    },
  };
}
