/**
 * Label Geometry Tests
 *
 * The printed label must be a single continuous wrap strip sized from the
 * physical MIRON Orion DIN18 bottle dimensions (verified on miron.com):
 *   label width  = π × bottle diameter − OVERLAP_GAP_MM (8mm viewing gap)
 *   label height ≈ a third of bottle height, clear of the shoulder
 * Output must be one A4 page with front and back panels on the one strip.
 */

import {
  generateLabelHtml,
  getSizeConfig,
  SIZE_CONFIGS,
  BOTTLE_GEOMETRY,
  OVERLAP_GAP_MM,
} from '../generator'

// miron.com Orion DIN18 specs: [size, expected wrap width, expected height]
const EXPECTED: [number, number, number][] = [
  [5, 63, 18],
  [10, 70, 20],
  [15, 83, 23],
  [20, 88, 25],
  [30, 99, 28],
  [50, 109, 32],
  [100, 132, 38],
]

describe('label geometry — MIRON Orion wrap dimensions', () => {
  it.each(EXPECTED)('%dml → %d×%dmm wrap (C − 8mm overlap)', (size, w, h) => {
    const config = getSizeConfig(size)
    expect(config.widthMm).toBe(w)
    expect(config.heightMm).toBe(h)
    // width derives from the verified bottle diameter
    const geo = BOTTLE_GEOMETRY[size]
    expect(config.widthMm).toBe(Math.round(Math.PI * geo.diameterMm) - OVERLAP_GAP_MM)
    // height stays under half the bottle height (clear of shoulder/cap)
    expect(config.heightMm).toBeLessThan(geo.bottleHeightMm * 0.5)
    // every wrap fits on an A4 sheet width (210mm − 2×10mm margins)
    expect(config.widthMm).toBeLessThanOrEqual(190)
  })

  it('every configured size resolves and unknown sizes fall back to 30ml', () => {
    expect(SIZE_CONFIGS[30]).toBeDefined()
    const fallback = getSizeConfig(999)
    expect(fallback.widthMm).toBe(getSizeConfig(30).widthMm)
  })
})

describe('label print sheet — one A4 page, both panels, true scale', () => {
  async function render(size: number) {
    return generateLabelHtml({
      blendName: 'Geometry Blend',
      oils: [{ oilId: 'lavender', name: 'Lavender', ml: size, percentage: 100 }],
      size,
      batchId: 'OA-GEO-1',
      madeDate: '2026-10-09',
      expiryDate: '2028-10-09',
      warnings: [],
    })
  }

  it.each([5, 30, 100])('%dml renders as a single wrap strip on one A4 sheet', async (size) => {
    const { html } = await render(size)
    // exactly one label strip, one front panel, one back panel
    expect((html.match(/class="label"/g) || []).length).toBe(1)
    expect((html.match(/class="front"/g) || []).length).toBe(1)
    expect((html.match(/class="back"/g) || []).length).toBe(1)
    // A4 page rule (not a label-sized page)
    expect(html).toContain('@page { size:A4 portrait; margin:0; }')
    // crop marks + scale warning present
    expect(html).toContain('class="cm tl"')
    expect(html).toContain('do not fit-to-page')
    // front + back panels tile the full wrap width
    const config = getSizeConfig(size)
    const frontMatch = html.match(/\.front \{\s*width:([\d.]+)mm/)
    const backMatch = html.match(/\.back \{\s*width:([\d.]+)mm/)
    expect(frontMatch).toBeTruthy()
    expect(backMatch).toBeTruthy()
    const total = parseFloat(frontMatch![1]) + parseFloat(backMatch![1])
    expect(Math.abs(total - config.widthMm)).toBeLessThan(0.2)
    // the label element is sized in real millimetres
    expect(html).toContain(`width:${config.widthMm}mm; height:${config.heightMm}mm;`)
    // spec caption carries the bottle geometry
    expect(html).toContain(`MIRON Orion Ø${BOTTLE_GEOMETRY[size].diameterMm}mm`)
  })
})
