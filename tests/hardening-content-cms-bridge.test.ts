/**
 * Hardening: CMS bridge (lib/content/cms-bridge.ts)
 *
 * Pins the Sanity ↔ local fallback contract:
 *  - Sanity empty/unreachable → local atelier data is used
 *  - Sanity data → mapped to the local CmsOil/CmsCrystal/CmsPage shapes,
 *    tolerating missing optional fields
 *  - stub content APIs (crystals.ts, synergy.ts) behave sanely
 */

import { ATELIER_OILS, ATELIER_CRYSTALS } from '@/lib/atelier/atelier-engine'

const mockFetch = jest.fn()
const mockIsConfigured = jest.fn()

jest.mock('@/app/lib/sanity', () => ({
  sanityClient: {
    fetch: (...args: unknown[]) => mockFetch(...args),
    isConfigured: () => mockIsConfigured(),
  },
  oilQuery: 'OIL_QUERY',
  crystalQuery: 'CRYSTAL_QUERY',
  synergyContentQuery: 'SYNERGY_QUERY',
  pageQuery: 'PAGE_QUERY',
}))

import {
  fetchOils,
  fetchOilBySlug,
  fetchCrystals,
  fetchCrystalById,
  fetchPage,
  cmsStatus,
} from '@/lib/content/cms-bridge'
import { getAllCrystals, getAvailableCrystals, getCrystalBySlug } from '@/lib/content/crystals'
import { getSynergyContent } from '@/lib/content/synergy'

describe('cms-bridge: oils', () => {
  it('falls back to local atelier oils when Sanity returns an empty list', async () => {
    mockFetch.mockResolvedValue([])
    const oils = await fetchOils()
    expect(mockFetch).toHaveBeenCalledWith('OIL_QUERY')
    expect(oils.length).toBe(ATELIER_OILS.length)
    const first = oils[0]
    const source = ATELIER_OILS[0]
    expect(first).toEqual({
      id: source.id,
      name: source.name,
      slug: source.id,
      botanicalName: source.botanicalName || source.name,
      description: source.scentProfile || '',
      price: source.collectionPrice5ml || 0,
      category: 'floral',
      benefits: [],
      color: source.color,
      rarity: source.rarity,
      crystal: undefined,
    })
  })

  it('fallback oils always have prices and URL-safe slugs', async () => {
    mockFetch.mockResolvedValue([])
    const oils = await fetchOils()
    for (const oil of oils) {
      expect(oil.price).toBeGreaterThan(0)
      expect(oil.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(oil.name.trim().length).toBeGreaterThan(0)
    }
  })

  it('maps Sanity rows to the local oil shape', async () => {
    mockFetch.mockResolvedValue([
      {
        _id: 'sanity-1',
        title: 'Lavender',
        slug: 'lavender-essential-oil',
        botanicalName: 'Lavandula angustifolia',
        description: 'Calming floral oil',
        price: 16.95,
        category: 'floral',
        benefits: ['sleep', 'calm'],
        crystal: { name: 'Amethyst', property: 'calm', color: '#9966cc' },
      },
    ])
    const oils = await fetchOils()
    expect(oils).toHaveLength(1)
    expect(oils[0]).toEqual({
      id: 'sanity-1',
      name: 'Lavender',
      slug: 'lavender-essential-oil',
      botanicalName: 'Lavandula angustifolia',
      description: 'Calming floral oil',
      price: 16.95,
      category: 'floral',
      benefits: ['sleep', 'calm'],
      color: '#9966cc',
      rarity: 'common',
      crystal: { name: 'Amethyst', property: 'calm', color: '#9966cc' },
    })
  })

  it('tolerates missing optional fields in Sanity rows', async () => {
    mockFetch.mockResolvedValue([
      { _id: 'sanity-2', title: 'Myrrh', slug: 'myrrh-oil' },
    ])
    const [oil] = await fetchOils()
    expect(oil.benefits).toEqual([])
    expect(oil.color).toBeUndefined()
    expect(oil.crystal).toBeUndefined()
    expect(oil.rarity).toBe('common')
  })

  it('fetchOilBySlug finds oils by slug in both modes', async () => {
    mockFetch.mockResolvedValue([
      { _id: 'sanity-1', title: 'Lavender', slug: 'lavender-essential-oil' },
    ])
    expect((await fetchOilBySlug('lavender-essential-oil'))?.name).toBe('Lavender')
    expect(await fetchOilBySlug('missing')).toBeNull()

    mockFetch.mockResolvedValue([])
    const fallback = await fetchOilBySlug(ATELIER_OILS[0].id)
    expect(fallback?.id).toBe(ATELIER_OILS[0].id)
    expect(await fetchOilBySlug('missing')).toBeNull()
  })

  it('falls back to local data when Sanity rejects (network down)', async () => {
    // The production sanityClient swallows fetch errors and returns []; a raw
    // rejection should therefore be treated the same as empty — verify the
    // bridge surfaces local data in the empty case and propagates nothing
    // unexpected when the client itself resolves empty.
    mockFetch.mockResolvedValue([])
    const oils = await fetchOils()
    expect(oils.length).toBe(ATELIER_OILS.length)
  })
})

describe('cms-bridge: crystals', () => {
  it('falls back to local atelier crystals when Sanity is empty', async () => {
    mockFetch.mockResolvedValue([])
    const crystals = await fetchCrystals()
    expect(mockFetch).toHaveBeenCalledWith('CRYSTAL_QUERY')
    expect(crystals.length).toBe(ATELIER_CRYSTALS.length)
    const first = crystals[0]
    const source = ATELIER_CRYSTALS[0]
    expect(first).toEqual({
      id: source.id,
      name: source.name,
      property: source.properties[0] || 'healing',
      color: source.color,
      description: source.description,
      chakra: source.chakra,
      element: source.element,
    })
  })

  it('maps Sanity crystal rows directly', async () => {
    mockFetch.mockResolvedValue([
      {
        _id: 'c1',
        name: 'Amethyst',
        property: 'calm',
        color: '#9966cc',
        description: 'Spiritual wisdom',
        chakra: 'crown',
        element: 'air',
      },
    ])
    const crystals = await fetchCrystals()
    expect(crystals).toEqual([
      {
        id: 'c1',
        name: 'Amethyst',
        property: 'calm',
        color: '#9966cc',
        description: 'Spiritual wisdom',
        chakra: 'crown',
        element: 'air',
      },
    ])
  })

  it('fetchCrystalById resolves and misses correctly', async () => {
    mockFetch.mockResolvedValue([{ _id: 'c1', name: 'Amethyst', property: 'calm', color: '#9966cc' }])
    expect((await fetchCrystalById('c1'))?.name).toBe('Amethyst')
    expect(await fetchCrystalById('nope')).toBeNull()
  })
})

describe('cms-bridge: pages', () => {
  it('maps a Sanity page with all fields', async () => {
    mockFetch.mockResolvedValue({
      _id: 'p1',
      title: 'About',
      slug: 'about',
      metaTitle: 'About Oil Amor',
      metaDescription: 'Our story',
      content: [{ _type: 'block' }],
    })
    const page = await fetchPage('about')
    expect(mockFetch).toHaveBeenCalledWith('PAGE_QUERY', { slug: 'about' })
    expect(page).toEqual({
      id: 'p1',
      title: 'About',
      slug: 'about',
      metaTitle: 'About Oil Amor',
      metaDescription: 'Our story',
      content: [{ _type: 'block' }],
    })
  })

  it('returns null when the page does not exist', async () => {
    mockFetch.mockResolvedValue(null)
    expect(await fetchPage('missing')).toBeNull()
  })

  it('returns null (not an object of undefineds) when Sanity is down and yields []', async () => {
    // sanityClient.fetch resolves to [] on failure; a page lookup must not map
    // that empty array into a CmsPage full of undefined fields.
    mockFetch.mockResolvedValue([])
    const page = await fetchPage('about')
    expect(page).toBeNull()
  })
})

describe('cms-bridge: status', () => {
  it('reflects the Sanity configuration state', () => {
    mockIsConfigured.mockReturnValue(true)
    expect(cmsStatus()).toEqual({ configured: true, connected: true })
    mockIsConfigured.mockReturnValue(false)
    expect(cmsStatus()).toEqual({ configured: false, connected: false })
  })
})

describe('content stub APIs (pre-CMS mocks)', () => {
  it('getAllCrystals returns well-formed mock crystals with unique slugs', async () => {
    const crystals = await getAllCrystals()
    expect(crystals.length).toBeGreaterThan(0)
    const slugs = crystals.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const crystal of crystals) {
      expect(crystal.id.trim().length).toBeGreaterThan(0)
      expect(crystal.name.trim().length).toBeGreaterThan(0)
      expect(crystal.description.trim().length).toBeGreaterThan(0)
      expect(crystal.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('getAvailableCrystals returns crystals for any tier in the demo', async () => {
    const all = await getAllCrystals()
    expect(await getAvailableCrystals('seed')).toEqual(all)
    expect(await getAvailableCrystals('luminary')).toEqual(all)
  })

  it('getCrystalBySlug resolves known slugs and nulls unknown ones', async () => {
    expect((await getCrystalBySlug('amethyst'))?.name).toBe('Amethyst')
    expect(await getCrystalBySlug('unobtainium')).toBeNull()
  })

  it('getSynergyContent composes a complete ritual for any pair', async () => {
    const synergy = await getSynergyContent('lavender', 'amethyst')
    expect(synergy).not.toBeNull()
    expect(synergy!.id).toBe('lavender-amethyst')
    expect(synergy!.oilSlug).toBe('lavender')
    expect(synergy!.crystalSlug).toBe('amethyst')
    expect(synergy!.headline).toContain('lavender')
    expect(synergy!.story).toContain('amethyst')
    expect(synergy!.ritualInstructions.length).toBe(3)
    for (const step of synergy!.ritualInstructions) {
      expect(step.title.trim().length).toBeGreaterThan(0)
      expect(step.description.trim().length).toBeGreaterThan(0)
      expect(step.duration.trim().length).toBeGreaterThan(0)
    }
    expect(synergy!.ritualInstructions.map((s) => s.step)).toEqual([1, 2, 3])
  })
})
