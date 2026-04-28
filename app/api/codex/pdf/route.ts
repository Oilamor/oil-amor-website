/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODEX PDF GENERATION API
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Generates beautiful, styled PDFs of the Living Blend Codex
 * and handles email delivery for sharing.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

interface CodexData {
  name: string
  soulHash: string
  uniquenessScore: number
  essence: string
  aura: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
  }
  composition: {
    oils: Array<{
      name: string
      ml: number
      percentage: number
    }>
    elemental: {
      fire: number
      water: number
      earth: number
      air: number
      dominant: string
    }
    noteDistribution: {
      top: number
      heart: number
      base: number
    }
    vibrationalFrequency: number
  }
  crystal: {
    name: string
    verb: string
    amplifies: string[]
    frequencyShift: number
  }
  cord: {
    name: string
    verb: string
    effect: string
    duration: string
  }
  carrier: {
    name: string
    absorption: string
    extendsNotes: string
    feel: string
  }
  therapeuticScores: Record<string, number>
  bestFor: string[]
  applicationMethods: Array<{
    method: string
    suitability: number
    instructions: string
  }>
  timing: {
    timeOfDay: string[]
    season: string
    lunarPhase: string
    maturation: {
      peakDay: number
      character: string
      shelfLife: string
    }
  }
  safety: {
    level: 'safe' | 'caution' | 'warning'
    phototoxic: boolean
    pregnancySafe: boolean
    ageRestriction?: string
    contraindications: string[]
  }
  safetyValidation?: {
    safetyScore: number
    experienceLevel: string
    warnings: Array<{
      id: string
      title: string
      message: string
      messageIntermediate?: string
      messageAdvanced?: string
      messageProfessional?: string
      riskLevel: 'info' | 'low' | 'moderate' | 'high' | 'critical'
      category: string
      routeSpecific?: string[]
      alternatives?: string[]
      requiresAcknowledgment?: boolean
    }>
  }
  ritual: {
    intention: string
    application: string
    storage: string
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function deepEscape<T>(obj: T): T {
  if (typeof obj === 'string') return escapeHtml(obj) as unknown as T
  if (Array.isArray(obj)) return obj.map(deepEscape) as unknown as T
  if (obj && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepEscape(value)
    }
    return result
  }
  return obj
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication to prevent unauthenticated XSS exploitation
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { codex, action, email } = await request.json()
    
    if (!codex) {
      return NextResponse.json({ error: 'Codex data required' }, { status: 400 })
    }

    // Generate the styled HTML for PDF
    const html = generateCodexHTML(codex)
    
    if (action === 'generate') {
      // Return HTML for client-side PDF generation
      return NextResponse.json({ html, codex })
    }
    
    if (action === 'email' && email) {
      // For email, we'd integrate with SendGrid/Resend/etc
      // For now, return the HTML that can be sent
      return NextResponse.json({ 
        success: true, 
        message: `Codex "${codex.name}" ready to send to ${email}`,
        html,
        codex
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

function generateCodexHTML(rawCodex: CodexData): string {
  // SECURITY: Deep-escape all user-controlled strings to prevent XSS
  const codex = deepEscape(rawCodex)
  const topTherapeutic = Object.entries(codex.therapeuticScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  const experience = codex.safetyValidation?.experienceLevel || 'beginner'

  const getWarningMessage = (w: NonNullable<typeof codex.safetyValidation>['warnings'][0]) => {
    if (experience === 'professional') return w.messageProfessional || w.messageAdvanced || w.messageIntermediate || w.message
    if (experience === 'advanced') return w.messageAdvanced || w.messageIntermediate || w.message
    if (experience === 'intermediate') return w.messageIntermediate || w.message
    return w.message
  }

  const riskColors: Record<string, {bg: string; border: string; text: string}> = {
    info:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', text: '#60a5fa' },
    low:     { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)',  text: '#4ade80' },
    moderate:{ bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#fbbf24' },
    high:    { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)', text: '#fb923c' },
    critical:{ bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  text: '#f87171' },
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${codex.name} - Living Blend Codex</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0a080c;
      background-color: #0a080c;
      color: #f5f3ef;
      line-height: 1.6;
      padding: 40px;
      min-height: 100vh;
    }

    .codex-container {
      max-width: 800px;
      margin: 0 auto;
      background: #111;
      background-color: #111;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 48px;
      box-shadow: 0 0 60px ${codex.aura.primaryColor}15;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 32px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .soul-hash {
      display: inline-block;
      padding: 6px 12px;
      background: #1a1a1a;
      background-color: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      letter-spacing: 0.1em;
      color: #c9a227;
      margin-bottom: 16px;
    }

    h1 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 42px;
      font-weight: 400;
      color: #f5f3ef;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }

    .meta {
      font-size: 13px;
      color: rgba(245, 243, 239, 0.55);
    }

    .meta span {
      margin: 0 12px;
    }

    .uniqueness {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(201, 162, 39, 0.18);
      background-color: rgba(201, 162, 39, 0.18);
      border-radius: 20px;
      font-size: 11px;
      color: #c9a227;
      font-weight: 500;
      margin-left: 12px;
    }

    .section {
      margin-bottom: 32px;
      padding-bottom: 32px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .section:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: rgba(245, 243, 239, 0.45);
      margin-bottom: 16px;
      font-weight: 500;
    }

    .essence {
      font-family: 'Cormorant Garamond', serif;
      font-size: 20px;
      line-height: 1.7;
      color: rgba(245, 243, 239, 0.92);
      font-style: italic;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }

    .card {
      background: #161616;
      background-color: #161616;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px;
    }

    .card h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: rgba(245, 243, 239, 0.45);
      margin-bottom: 16px;
      font-weight: 500;
    }

    .elemental-item {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }

    .elemental-name {
      width: 50px;
      font-size: 12px;
      color: rgba(245, 243, 239, 0.65);
      text-transform: capitalize;
    }

    .elemental-bar {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      margin: 0 12px;
    }

    .elemental-fill {
      height: 100%;
      border-radius: 2px;
    }

    .elemental-value {
      width: 30px;
      font-size: 11px;
      color: rgba(245, 243, 239, 0.45);
      text-align: right;
    }

    .oil-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 13px;
    }

    .oil-item:last-child {
      border-bottom: none;
    }

    .oil-name {
      color: rgba(245, 243, 239, 0.85);
    }

    .oil-meta {
      color: rgba(245, 243, 239, 0.5);
      font-size: 11px;
    }

    .oil-percentage {
      color: #c9a227;
      font-weight: 500;
      margin-left: 8px;
    }

    .component-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .component-card {
      background: #161616;
      background-color: #161616;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
    }

    .component-card h4 {
      font-size: 14px;
      color: rgba(245, 243, 239, 0.92);
      margin-bottom: 6px;
      font-weight: 500;
    }

    .component-card p {
      font-size: 12px;
      color: rgba(245, 243, 239, 0.55);
      line-height: 1.6;
    }

    .therapeutic-item {
      margin-bottom: 12px;
    }

    .therapeutic-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
    }

    .therapeutic-name {
      color: rgba(245, 243, 239, 0.75);
    }

    .therapeutic-value {
      color: rgba(245, 243, 239, 0.45);
    }

    .therapeutic-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
    }

    .therapeutic-fill {
      height: 100%;
      background: #c9a227;
      background-color: #c9a227;
      border-radius: 3px;
    }

    .therapeutic-fill.low {
      background: rgba(255, 255, 255, 0.3);
      background-color: rgba(255, 255, 255, 0.3);
    }

    .application-card {
      background: rgba(201, 162, 39, 0.1);
      background-color: rgba(201, 162, 39, 0.1);
      border: 1px solid rgba(201, 162, 39, 0.22);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .application-card.alt {
      background: #161616;
      background-color: #161616;
      border-color: rgba(255, 255, 255, 0.08);
    }

    .application-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .application-name {
      font-size: 13px;
      color: #c9a227;
      font-weight: 500;
    }

    .application-card.alt .application-name {
      color: rgba(245, 243, 239, 0.85);
    }

    .application-match {
      font-size: 11px;
      color: rgba(245, 243, 239, 0.45);
    }

    .application-instructions {
      font-size: 11px;
      color: rgba(245, 243, 239, 0.55);
      line-height: 1.5;
    }

    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .info-card {
      background: #13132a;
      background-color: #13132a;
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 16px;
      padding: 24px;
    }

    .info-card.safety {
      background: ${codex.safety.level === 'safe' ? '#0a1f16' : codex.safety.level === 'caution' ? '#1f1606' : '#1f0a0a'};
      background-color: ${codex.safety.level === 'safe' ? '#0a1f16' : codex.safety.level === 'caution' ? '#1f1606' : '#1f0a0a'};
      border-color: ${codex.safety.level === 'safe' ? 'rgba(16, 185, 129, 0.25)' : codex.safety.level === 'caution' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)'};
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }

    .info-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      background: rgba(255,255,255,0.06);
      background-color: rgba(255,255,255,0.06);
    }

    .info-label {
      font-size: 11px;
      color: rgba(245, 243, 239, 0.45);
      margin-bottom: 2px;
    }

    .info-value {
      font-size: 13px;
      color: rgba(245, 243, 239, 0.9);
    }

    .safety-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .safety-badge.safe {
      background: rgba(16, 185, 129, 0.18);
      background-color: rgba(16, 185, 129, 0.18);
      color: #34d399;
    }

    .safety-badge.caution {
      background: rgba(245, 158, 11, 0.18);
      background-color: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
    }

    .safety-badge.warning {
      background: rgba(239, 68, 68, 0.18);
      background-color: rgba(239, 68, 68, 0.18);
      color: #f87171;
    }

    .caution-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      color: rgba(245, 243, 239, 0.65);
      margin-bottom: 8px;
    }

    .caution-icon {
      color: #fbbf24;
      font-size: 12px;
      font-weight: 700;
    }

    .warning-box {
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 10px;
    }

    .warning-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .warning-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }

    .warning-title {
      font-size: 13px;
      color: rgba(245, 243, 239, 0.92);
      font-weight: 500;
      margin-bottom: 2px;
    }

    .warning-message {
      font-size: 12px;
      color: rgba(245, 243, 239, 0.65);
      line-height: 1.5;
    }

    .warning-alts {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }

    .warning-alt-label {
      font-size: 10px;
      color: #c9a227;
    }

    .warning-alt {
      font-size: 10px;
      padding: 3px 8px;
      background: rgba(201, 162, 39, 0.12);
      background-color: rgba(201, 162, 39, 0.12);
      border-radius: 20px;
      color: #c9a227;
    }

    .ritual-card {
      background: #1a150a;
      background-color: #1a150a;
      border: 1px solid rgba(201, 162, 39, 0.2);
      border-radius: 16px;
      padding: 28px;
    }

    .ritual-section {
      margin-bottom: 20px;
    }

    .ritual-section:last-child {
      margin-bottom: 0;
      padding-top: 20px;
      border-top: 1px solid rgba(201, 162, 39, 0.15);
    }

    .ritual-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: rgba(245, 243, 239, 0.45);
      margin-bottom: 6px;
    }

    .ritual-intention {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      font-style: italic;
      color: rgba(245, 243, 239, 0.92);
      line-height: 1.5;
    }

    .ritual-text {
      font-size: 13px;
      color: rgba(245, 243, 239, 0.75);
      line-height: 1.6;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .footer-logo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      color: #c9a227;
      margin-bottom: 4px;
    }

    .footer-tagline {
      font-size: 11px;
      color: rgba(245, 243, 239, 0.45);
    }

    .best-for-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .tag {
      padding: 6px 12px;
      background: #1f1f1f;
      background-color: #1f1f1f;
      border-radius: 20px;
      font-size: 11px;
      color: rgba(245, 243, 239, 0.75);
    }

    .safety-score {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
      margin-bottom: 12px;
    }

    .score-good { background: rgba(16, 185, 129, 0.15); background-color: rgba(16, 185, 129, 0.15); color: #34d399; }
    .score-mid { background: rgba(245, 158, 11, 0.15); background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .score-poor { background: rgba(239, 68, 68, 0.15); background-color: rgba(239, 68, 68, 0.15); color: #f87171; }

    @media print {
      body {
        background: #0a080c !important;
        background-color: #0a080c !important;
      }
      .codex-container, .card, .component-card, .application-card.alt {
        background: #111 !important;
        background-color: #111 !important;
      }
      .info-card {
        background: #13132a !important;
        background-color: #13132a !important;
      }
      .info-card.safety {
        background: ${codex.safety.level === 'safe' ? '#0a1f16' : codex.safety.level === 'caution' ? '#1f1606' : '#1f0a0a'} !important;
        background-color: ${codex.safety.level === 'safe' ? '#0a1f16' : codex.safety.level === 'caution' ? '#1f1606' : '#1f0a0a'} !important;
      }
      .ritual-card {
        background: #1a150a !important;
        background-color: #1a150a !important;
      }
    }
  </style>
</head>
<body>
  <div class="codex-container">
    <!-- Header -->
    <div class="header">
      <div class="soul-hash">${codex.soulHash}</div>
      <h1>${codex.name}</h1>
      <div class="meta">
        ${codex.composition.vibrationalFrequency}Hz
        <span>•</span>
        ${codex.composition.oils.length} Oils
        <span class="uniqueness">${codex.uniquenessScore}% Unique</span>
      </div>
    </div>

    <!-- The Essence -->
    <div class="section">
      <div class="section-title">The Essence</div>
      <p class="essence">${codex.essence}</p>
    </div>

    <!-- Composition Grid -->
    <div class="section">
      <div class="section-title">Composition</div>
      <div class="grid">
        <!-- Elemental -->
        <div class="card">
          <h3>Elemental Nature</h3>
          <div class="elemental-item">
            <span class="elemental-name">Fire</span>
            <div class="elemental-bar">
              <div class="elemental-fill" style="width: ${codex.composition.elemental.fire}%; background: #dc2626; background-color: #dc2626;"></div>
            </div>
            <span class="elemental-value">${Math.round(codex.composition.elemental.fire)}%</span>
          </div>
          <div class="elemental-item">
            <span class="elemental-name">Water</span>
            <div class="elemental-bar">
              <div class="elemental-fill" style="width: ${codex.composition.elemental.water}%; background: #0891b2; background-color: #0891b2;"></div>
            </div>
            <span class="elemental-value">${Math.round(codex.composition.elemental.water)}%</span>
          </div>
          <div class="elemental-item">
            <span class="elemental-name">Earth</span>
            <div class="elemental-bar">
              <div class="elemental-fill" style="width: ${codex.composition.elemental.earth}%; background: #92400e; background-color: #92400e;"></div>
            </div>
            <span class="elemental-value">${Math.round(codex.composition.elemental.earth)}%</span>
          </div>
          <div class="elemental-item">
            <span class="elemental-name">Air</span>
            <div class="elemental-bar">
              <div class="elemental-fill" style="width: ${codex.composition.elemental.air}%; background: #e0f2fe; background-color: #e0f2fe;"></div>
            </div>
            <span class="elemental-value">${Math.round(codex.composition.elemental.air)}%</span>
          </div>
        </div>

        <!-- Notes -->
        <div class="card">
          <h3>Aromatic Structure</h3>
          <div class="elemental-item">
            <span class="elemental-name">Top</span>
            <div class="elemental-bar">
              <div class="elemental-fill" style="width: ${codex.composition.noteDistribution.top}%; background: #fbbf24; background-color: #fbbf24;"></div>
            </div>
            <span class="elemental-value">${Math.round(codex.composition.noteDistribution.top)}%</span>
          </div>
          <div class="elemental-item">
            <span class="elemental-name">Heart</span>
            <div class="elemental-bar">
              <div class="elemental-fill" style="width: ${codex.composition.noteDistribution.heart}%; background: #f472b6; background-color: #f472b6;"></div>
            </div>
            <span class="elemental-value">${Math.round(codex.composition.noteDistribution.heart)}%</span>
          </div>
          <div class="elemental-item">
            <span class="elemental-name">Base</span>
            <div class="elemental-bar">
              <div class="elemental-fill" style="width: ${codex.composition.noteDistribution.base}%; background: #8b5cf6; background-color: #8b5cf6;"></div>
            </div>
            <span class="elemental-value">${Math.round(codex.composition.noteDistribution.base)}%</span>
          </div>
        </div>

        <!-- Oils -->
        <div class="card">
          <h3>Oils (${codex.composition.oils.length})</h3>
          ${codex.composition.oils.map(oil => `
            <div class="oil-item">
              <span class="oil-name">${oil.name}</span>
              <span class="oil-meta">${oil.ml}ml <span class="oil-percentage">${Math.round(oil.percentage)}%</span></span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Component Weave -->
    <div class="section">
      <div class="section-title">Component Weave</div>
      <div class="component-grid">
        <div class="component-card">
          <h4>${codex.crystal.name}</h4>
          <p>${codex.crystal.verb} the blend. Amplifies: ${codex.crystal.amplifies.slice(0, 2).join(', ')}. Shifts frequency by ${codex.crystal.frequencyShift > 0 ? '+' : ''}${codex.crystal.frequencyShift}Hz.</p>
        </div>
        <div class="component-card">
          <h4>${codex.cord.name}</h4>
          <p>${codex.cord.verb}, ${codex.cord.effect}. ${codex.cord.duration}.</p>
        </div>
        <div class="component-card">
          <h4>${codex.carrier.name}</h4>
          <p>${codex.carrier.absorption} absorption. ${codex.carrier.extendsNotes} Feel: ${codex.carrier.feel}.</p>
        </div>
      </div>
    </div>

    <!-- Practical Profile -->
    <div class="section">
      <div class="section-title">Therapeutic Profile</div>
      <div class="two-col">
        <div>
          ${topTherapeutic.map(([name, score], i) => `
            <div class="therapeutic-item">
              <div class="therapeutic-header">
                <span class="therapeutic-name" style="${score > 60 ? 'color: #c9a227;' : ''}">${name}</span>
                <span class="therapeutic-value">${score}%</span>
              </div>
              <div class="therapeutic-bar">
                <div class="therapeutic-fill ${score < 60 ? 'low' : ''}" style="width: ${score}%;"></div>
              </div>
            </div>
          `).join('')}

          <div class="best-for-tags">
            ${codex.bestFor.map(use => `<span class="tag">${use}</span>`).join('')}
          </div>
        </div>

        <div>
          ${codex.applicationMethods.slice(0, 4).map((method, i) => `
            <div class="application-card ${i > 0 ? 'alt' : ''}">
              <div class="application-header">
                <span class="application-name">${method.method}</span>
                <span class="application-match">${method.suitability}% match</span>
              </div>
              <p class="application-instructions">${method.instructions}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Timing & Safety -->
    <div class="section">
      <div class="section-title">Timing & Safety</div>
      <div class="two-col">
        <div class="info-card">
          <div class="info-item">
            <div class="info-icon" style="background: rgba(251, 191, 36, 0.15); background-color: rgba(251, 191, 36, 0.15);">☀</div>
            <div>
              <div class="info-label">Best Time</div>
              <div class="info-value">${codex.timing.timeOfDay.join(', ')}</div>
            </div>
          </div>
          <div class="info-item">
            <div class="info-icon" style="background: rgba(139, 92, 246, 0.15); background-color: rgba(139, 92, 246, 0.15);">🌙</div>
            <div>
              <div class="info-label">Lunar Phase</div>
              <div class="info-value">${codex.timing.lunarPhase}</div>
            </div>
          </div>
          <div class="info-item">
            <div class="info-icon" style="background: rgba(16, 185, 129, 0.15); background-color: rgba(16, 185, 129, 0.15);">🌿</div>
            <div>
              <div class="info-label">Season</div>
              <div class="info-value">${codex.timing.season}</div>
            </div>
          </div>
          <div class="info-item">
            <div class="info-icon" style="background: rgba(201, 162, 39, 0.15); background-color: rgba(201, 162, 39, 0.15);">✦</div>
            <div>
              <div class="info-label">Peak Maturation</div>
              <div class="info-value">Day ${codex.timing.maturation.peakDay} — ${codex.timing.maturation.shelfLife} shelf life</div>
            </div>
          </div>
        </div>

        <div class="info-card safety">
          ${codex.safetyValidation ? `
            <div class="safety-score ${codex.safetyValidation.safetyScore >= 80 ? 'score-good' : codex.safetyValidation.safetyScore >= 60 ? 'score-mid' : 'score-poor'}">
              Safety Score: ${codex.safetyValidation.safetyScore}/100
            </div>
            ${codex.safetyValidation.warnings.length === 0 ? `
              <div class="caution-item" style="color: #34d399;">
                <span style="color: #34d399;">✓</span>
                <span>No warnings found for your profile.</span>
              </div>
            ` : codex.safetyValidation.warnings.map(w => {
              const rc = riskColors[w.riskLevel] || riskColors.info
              return `
                <div class="warning-box" style="background: ${rc.bg}; background-color: ${rc.bg}; border: 1px solid ${rc.border};">
                  <div class="warning-header">
                    <span class="warning-label" style="color: ${rc.text};">${w.riskLevel.toUpperCase()}</span>
                    ${w.routeSpecific ? `<span style="font-size: 10px; padding: 2px 8px; background: rgba(255,255,255,0.08); border-radius: 20px; color: rgba(245,243,239,0.6);">${w.routeSpecific.join(', ')}</span>` : ''}
                  </div>
                  <div class="warning-title">${w.title}</div>
                  <div class="warning-message">${getWarningMessage(w)}</div>
                  ${w.alternatives && w.alternatives.length ? `
                    <div class="warning-alts">
                      <span class="warning-alt-label">Alternatives:</span>
                      ${w.alternatives.map(a => `<span class="warning-alt">${a}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `
            }).join('')}
          ` : `
            <div class="safety-badge ${codex.safety.level}">
              ${codex.safety.level === 'safe' ? '✓' : codex.safety.level === 'caution' ? '!' : '⚠'} ${codex.safety.level.charAt(0).toUpperCase() + codex.safety.level.slice(1)}
            </div>

            ${!codex.safety.pregnancySafe ? `
              <div class="caution-item">
                <span class="caution-icon">!</span>
                <span>Not recommended during pregnancy</span>
              </div>
            ` : ''}

            ${codex.safety.ageRestriction ? `
              <div class="caution-item">
                <span class="caution-icon">!</span>
                <span>Age restriction: ${codex.safety.ageRestriction}</span>
              </div>
            ` : ''}

            ${codex.safety.contraindications.map(caution => `
              <div class="caution-item">
                <span class="caution-icon">!</span>
                <span>${caution}</span>
              </div>
            `).join('')}
          `}
        </div>
      </div>
    </div>

    <!-- The Ritual -->
    <div class="section">
      <div class="section-title">The Ritual</div>
      <div class="ritual-card">
        <div class="ritual-section">
          <div class="ritual-label">Intention Setting</div>
          <p class="ritual-intention">"${codex.ritual.intention}."</p>
        </div>
        <div class="ritual-section">
          <div class="ritual-label">Application</div>
          <p class="ritual-text">${codex.ritual.application}</p>
        </div>
        <div class="ritual-section">
          <div class="ritual-label">Storage</div>
          <p class="ritual-text">${codex.ritual.storage}</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-logo">Oil Amor</div>
      <div class="footer-tagline">Living Blend Codex • Generated ${new Date().toLocaleDateString()}</div>
    </div>
  </div>
</body>
</html>
  `
}
