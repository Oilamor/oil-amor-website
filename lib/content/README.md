# Oil Amor Content & Database System

A sophisticated content management system for the world's most advanced essential oil shopping experience, built on Sanity CMS with Redis caching.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Content API Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Synergy API  │  Crystal API  │  Cord API  │  Cache Layer   │
├─────────────────────────────────────────────────────────────┤
│                    Sanity CMS Client                        │
├─────────────────────────────────────────────────────────────┤
│                    Redis Cache Store                        │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
lib/content/
├── README.md                 # This file
├── index.ts                  # Main exports
├── types.ts                  # TypeScript type definitions
├── cache.ts                  # Redis caching utilities
├── crystal-config.ts         # Bottle-crystal mapping config
├── synergy.ts                # Oil-Crystal synergy API
├── crystals.ts               # Crystal management API
├── cords.ts                  # Cord/Charm/Chain API
└── __tests__/                # Unit tests
    ├── crystal-config.test.ts
    ├── cache.test.ts
    └── types.test.ts

sanity/schemas/
├── crystal.ts                # Crystal document schema
├── synergyContent.ts         # Synergy content schema
├── cordType.ts               # Cord/Charm/Chain schema
├── oil.ts                    # Enhanced oil schema
└── index.ts                  # Schema exports

scripts/
└── seed-synergy-content.ts   # Database seeding script
```

## Schemas

### Crystal (`crystal.ts`)
Metaphysical properties database with:
- Chakra, element, zodiac alignments
- Educational content blocks
- Availability tracking
- Mohs hardness and color variants

### Oil (`oil.ts` - Enhanced)
Extended essential oil schema with:
- Crystal synergy references
- Therapeutic properties (emotional/physical/spiritual)
- Botanical origin details
- Extraction methods
- Safety notes and contraindications
- Olfactory profile (notes pyramid)

### Synergy Content (`synergyContent.ts`)
Dynamic content for 144 oil-crystal combinations:
- Compelling headlines (max 40 chars)
- Story paragraphs (150-200 words)
- Scientific notes (evidence-based)
- Ritual instructions (3-5 steps)
- Chakra/element/zodiac alignment
- Frequency associations (Solfeggio)
- Collection themes

### Cord Type (`cordType.ts`)
Accessory catalog with:
- Type: cord, charm, or chain
- Material specifications
- Tier requirements (seed → luminary)
- Purchase count unlocks (charms)
- Symbolism descriptions

## API Reference

### Synergy API

```typescript
import { 
  getSynergyContent,
  getAllSynergiesForOil,
  getRecommendedCrystal,
  getFeaturedSynergies,
  getSynergiesByIntention 
} from '@/lib/content'

// Get specific oil-crystal combination
const synergy = await getSynergyContent('lavender', 'amethyst')

// Get all synergies for an oil
const synergies = await getAllSynergiesForOil('lavender')

// Get recommended crystal for an oil
const crystal = await getRecommendedCrystal('rose-otto')

// Get featured synergies
const featured = await getFeaturedSynergies(6)

// Get synergies by intention
const sleepSynergies = await getSynergiesByIntention('sleep', 10)
```

### Crystal API

```typescript
import {
  getAllCrystals,
  getCrystalBySlug,
  getCrystalProperties,
  getCrystalsByChakra,
  getCrystalsByElement,
  getCrystalsByZodiac,
  getAvailableCrystals
} from '@/lib/content'

// Get all crystals
const crystals = await getAllCrystals()

// Get single crystal
const amethyst = await getCrystalBySlug('amethyst')

// Filter by metaphysical properties
const heartCrystals = await getCrystalsByChakra('heart')
const waterCrystals = await getCrystalsByElement('water')
const scorpioCrystals = await getCrystalsByZodiac('scorpio')
```

### Cord/Charm/Chain API

```typescript
import {
  getAvailableCords,
  getAvailableCharms,
  getAvailableChains,
  getAllCordOptions,
  getDefaultCord
} from '@/lib/content'

// Get options for customer tier
const cords = await getAvailableCords('bloom')
const charms = await getAvailableCharms('radiance', 10) // tier, purchase count
const chains = await getAvailableChains('luminary')

// Get all options at once
const options = await getAllCordOptions('sprout', 2)
```

### Crystal Config

```typescript
import {
  getCrystalCountForBottle,
  getCrystalConfigForBottle,
  getAllBottleConfigs,
  isValidBottleSize
} from '@/lib/content'

// Crystal count for bottle size
const count = getCrystalCountForBottle('15ml') // 6

// Complete config
const config = getCrystalConfigForBottle('30ml')
// { count: 12, weight: 50, description: 'Crystal Garden' }
```

## Bottle-Crystal Mapping

| Size  | Crystals | Weight | Description     |
|-------|----------|--------|-----------------|
| 5ml   | 3        | 8g     | Crystal Tease   |
| 10ml  | 4        | 15g    | Crystal Whisper |
| 15ml  | 6        | 25g    | Crystal Touch   |
| 20ml  | 8        | 35g    | Crystal Nest    |
| 30ml  | 12       | 50g    | Crystal Garden  |

## Caching Strategy

All API functions implement Redis caching with optimized TTL:

| Content Type | TTL    | Strategy                      |
|--------------|--------|-------------------------------|
| Synergy      | 24 hrs | Content rarely changes        |
| Crystal      | 6 hrs  | Inventory may change          |
| Cord         | 2 hrs  | Availability changes often    |
| Oil          | 12 hrs | Product data changes moderate |

### Cache Keys

```
oil-amor:synergy:{oilSlug}:{crystalSlug}
oil-amor:crystals-all
oil-amor:crystal-slug:{slug}
oil-amor:cords-available:{tier}
oil-amor:charms-available:{tier}:{purchaseCount}
```

## Tier System

Customer tiers unlock different cord/charm/chain options:

| Tier     | Level | Unlocks                                |
|----------|-------|----------------------------------------|
| Seed     | 0     | Basic cords, lotus charm               |
| Sprout   | 1     | Silk cord, moon charm                  |
| Bloom    | 2     | Sterling silver chain, tree of life    |
| Radiance | 3     | Gold-filled chain, evil eye charm      |
| Luminary | 4     | Rose gold chain, all premium options   |

## Seeding Data

Populate the database with complete content:

```bash
# Set environment variables
export SANITY_TOKEN="your-token"
export NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"

# Run seed script
npx ts-node scripts/seed-synergy-content.ts
```

### What Gets Seeded

- **12 Essential Oils**: Lavender, Rose Otto, Eucalyptus, Tea Tree, Frankincense, Peppermint, Sandalwood, Lemon, Ylang Ylang, Cedarwood, Bergamot, Clary Sage

- **12 Crystals**: Amethyst, Rose Quartz, Citrine, Clear Quartz, Black Tourmaline, Carnelian, Lapis Lazuli, Moonstone, Garnet, Labradorite, Aventurine, Selenite

- **144 Synergy Combinations**: Complete content matrix with:
  - Unique headlines and stories
  - Scientific notes
  - Ritual instructions
  - Frequency associations
  - Collection themes

- **Cord/Charm/Chain Catalog**: Full accessory inventory

## Content Quality Standards

Each synergy combination includes:

1. **Headline** (max 40 chars): Compelling, evocative
2. **Story** (150-200 words): Emotional narrative + education
3. **Scientific Note**: Evidence-based, accessible
4. **Ritual Instructions**: 3-5 clear steps
5. **Alignment Data**: Chakra, element, zodiac
6. **Frequency** (optional): Solfeggio frequencies

## Error Handling

All API functions include comprehensive error handling:

```typescript
// Returns null for missing content
const synergy = await getSynergyContent('invalid', 'crystal')
// → null

// Returns empty array for no matches
const synergies = await getAllSynergiesForOil('nonexistent')
// → []

// Cache failures are logged but don't break functionality
```

## Testing

```bash
# Run content tests
npm test -- lib/content

# Run with coverage
npm test -- lib/content --coverage
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SANITY_PROJECT_ID=xxx
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-03-21
SANITY_TOKEN=xxx  # With write permissions for seeding

# Optional (Upstash REST — shared Redis client for content caching)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

## Performance Considerations

- All queries use GROQ projections to fetch only needed fields
- Redis caching reduces Sanity API calls
- Cache warming prevents cold starts
- Batch operations for related data fetching
- Optimistic UI updates for cart operations

## Future Enhancements

- [ ] Incremental Static Regeneration (ISR) integration
- [ ] Webhook-based cache invalidation
- [ ] A/B testing for synergy content
- [ ] User-generated content moderation
- [ ] Real-time inventory sync
- [ ] Multi-language support
- [ ] Advanced search with Algolia

## License

Private - Oil Amor Internal System
