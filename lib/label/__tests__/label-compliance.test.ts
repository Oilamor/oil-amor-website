/**
 * Label Compliance Tests
 *
 * Physical-label compliance requirements:
 * - Standing warnings (external use / do not ingest / children) ALWAYS print,
 *   never gated behind a zero-warning fallback or truncated on small bottles
 * - Dynamic warnings are capped at 2 printed badges (most severe first) —
 *   physical label space is fixed and the QR code carries the full profile
 * - Manufacturer, Australian address, and country of origin always present
 * - Directions, Poisons Information first-aid line, and storage line present
 * - Intended-use wording is ritual/aromatic framing (TGA-safe), ids stable
 */

import { generateLabelHtml, type LabelData } from '../generator'

function baseLabel(overrides: Partial<LabelData> = {}): LabelData {
  return {
    blendName: 'Compliance Blend',
    oils: [{ name: 'Lemon', percentage: 100, ml: 30, oilId: 'lemon' }],
    size: 30,
    batchId: 'OA-TEST-LABEL-1',
    madeDate: '01/01/2026',
    expiryDate: '01/01/2027',
    warnings: [],
    ...overrides,
  }
}

describe('generateLabelHtml — label compliance', () => {
  it('always prints the three standing warnings, even with dynamic warnings present', async () => {
    const { html } = await generateLabelHtml(baseLabel({
      // Clove bud: avoid in pregnancy → critical dynamic warning
      oils: [{ name: 'Clove Bud', percentage: 100, ml: 30, oilId: 'clove-bud' }],
      warnings: ['Custom blend warning'],
    }))

    expect(html).toContain('External use only')
    expect(html).toContain('Do not ingest')
    expect(html).toContain('Keep out of reach of children')
    // Dynamic warnings still render alongside the standing ones
    expect(html).toContain('Avoid in pregnancy')
  })

  it('prints standing warnings for a blend with zero dynamic warnings', async () => {
    const { html } = await generateLabelHtml(baseLabel())

    expect(html).toContain('External use only')
    expect(html).toContain('Do not ingest')
    expect(html).toContain('Keep out of reach of children')
  })

  it('caps printed warnings at 2 regardless of severity and points to the QR for the rest', async () => {
    // Three oils that each produce a critical (pregnancy-avoid) warning.
    // Physical label space is fixed — the QR code carries the full safety
    // profile — so at most 2 badges print even when all are critical.
    const { html, sizeConfig } = await generateLabelHtml(baseLabel({
      size: 5,
      oils: [
        { name: 'Clove Bud', percentage: 34, ml: 1.7, oilId: 'clove-bud' },
        { name: 'Wintergreen', percentage: 33, ml: 1.65, oilId: 'wintergreen' },
        { name: 'Cinnamon Bark', percentage: 33, ml: 1.65, oilId: 'cinnamon-bark' },
      ],
    }))

    // Most severe two print; the third is deferred to the QR page
    expect(html).toContain('Avoid in pregnancy')
    expect(sizeConfig.warningsShown).toBe(2)
    expect(html).toContain('more warnings')
    expect(html).toContain('scan QR for complete info')
    expect(html.match(/<div class="w-badge"/g)?.length).toBe(2)
  })

  it('prints manufacturer, Australian address, and country of origin', async () => {
    const { html } = await generateLabelHtml(baseLabel())

    expect(html).toContain('Made in Australia by')
    expect(html).toContain('<strong>Oil Amor</strong>')
    expect(html).toContain('Central Coast NSW, Australia')
  })

  it('prints directions, Poisons first-aid line, and storage line', async () => {
    const { html } = await generateLabelHtml(baseLabel())

    expect(html).toContain('Directions:')
    expect(html).toContain('For aromatic use. Dilute with a carrier oil before topical application. Not for internal use.')
    expect(html).toContain('contact the Poisons Information Centre on 13 11 26.')
    expect(html).toContain('Store below 30°C, away from direct sunlight.')
  })

  it('renders ritual/aromatic wording for intended use, not the raw therapeutic id', async () => {
    const { html } = await generateLabelHtml(baseLabel({ intendedUse: 'sleep' }))

    expect(html).toContain('Evening ritual')
    expect(html).not.toContain('>sleep<')
  })
})
