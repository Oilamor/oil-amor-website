/**
 * Oil Amor — Inventory Seeding Script
 * Seeds the inventory_items table with realistic starting quantities
 * for all SKUs needed to fulfill orders.
 *
 * Run with: npx ts-node scripts/seed-inventory.ts
 */

import { db } from '../lib/db'
import { inventoryItems } from '../lib/db/schema-refill'
import { eq } from 'drizzle-orm'

// ============================================================================
// CONFIGURATION
// ============================================================================

// 6 oils that are in stock for immediate shipment
const STOCKED_OILS = [
  { id: 'tea-tree', name: 'Tea Tree' },
  { id: 'lavender', name: 'Lavender' },
  { id: 'jojoba', name: 'Jojoba' },
  { id: 'lemongrass', name: 'Lemongrass' },
  { id: 'clove-bud', name: 'Clove Bud' },
  { id: 'eucalyptus', name: 'Blue Mallee Eucalyptus' },
]

// All other oils (preorder — 0 stock)
const PREORDER_OILS = [
  { id: 'clary-sage', name: 'Clary Sage' },
  { id: 'ginger', name: 'Ginger' },
  { id: 'cinnamon-bark', name: 'Cinnamon Bark' },
  { id: 'may-chang', name: 'May Chang' },
  { id: 'patchouli-dark', name: 'Patchouli Dark' },
  { id: 'carrot-seed', name: 'Carrot Seed' },
  { id: 'geranium-bourbon', name: 'Geranium Bourbon' },
  { id: 'juniper-berry', name: 'Juniper Berry' },
  { id: 'cinnamon-leaf', name: 'Cinnamon Leaf' },
  { id: 'lemon-myrtle', name: 'Lemon Myrtle' },
  { id: 'lemon', name: 'Lemon' },
  { id: 'myrrh', name: 'Myrrh' },
  { id: 'bergamot-fcf', name: 'Bergamot (FCF) Organic' },
  { id: 'sweet-orange', name: 'Sweet Orange' },
  { id: 'frankincense', name: 'Frankincense' },
  { id: 'peppermint', name: 'Peppermint' },
  { id: 'grapefruit', name: 'Pink Grapefruit' },
  { id: 'cedarwood', name: 'Cedarwood Atlas' },
  { id: 'ylang-ylang', name: 'Ylang Ylang' },
  { id: 'rosemary', name: 'Rosemary' },
  { id: 'camphor-white', name: 'Camphor White' },
  { id: 'vetiver', name: 'Vetiver' },
  { id: 'ho-wood', name: 'Ho Wood' },
  { id: 'wintergreen', name: 'Wintergreen' },
  { id: 'cypress', name: 'Cypress' },
  { id: 'basil-linalool', name: 'Basil CT Linalool' },
  { id: 'oregano', name: 'Oregano' },
]

const BOTTLE_SIZES = ['5ml', '10ml', '15ml', '20ml', '30ml']

const CRYSTALS = [
  { id: 'amethyst', name: 'Amethyst' },
  { id: 'rose-quartz', name: 'Rose Quartz' },
  { id: 'citrine', name: 'Citrine' },
  { id: 'clear-quartz', name: 'Clear Quartz' },
  { id: 'black-tourmaline', name: 'Black Tourmaline' },
  { id: 'smoky-quartz', name: 'Smoky Quartz' },
  { id: 'hematite', name: 'Hematite' },
  { id: 'green-aventurine', name: 'Green Aventurine' },
  { id: 'sodalite', name: 'Sodalite' },
  { id: 'carnelian', name: 'Carnelian' },
  { id: 'lapis-lazuli', name: 'Lapis Lazuli' },
  { id: 'tiger-eye', name: "Tiger's Eye" },
  { id: 'moonstone', name: 'Moonstone' },
  { id: 'garnet', name: 'Garnet' },
  { id: 'sunstone', name: 'Sunstone' },
  { id: 'orange-calcite', name: 'Orange Calcite' },
  { id: 'moss-agate', name: 'Moss Agate' },
  { id: 'blue-lace-agate', name: 'Blue Lace Agate' },
  { id: 'fluorite', name: 'Fluorite' },
  { id: 'labradorite', name: 'Labradorite' },
  { id: 'obsidian', name: 'Obsidian' },
  { id: 'howlite', name: 'Howlite' },
  { id: 'red-jasper', name: 'Red Jasper' },
  { id: 'lepidolite', name: 'Lepidolite' },
  { id: 'rhodonite', name: 'Rhodonite' },
]

const CORDS = [
  { id: 'waxed-cotton', name: 'Waxed Cotton Cord' },
  { id: 'hemp', name: 'Hemp Cord' },
  { id: 'silk', name: 'Silk Cord' },
  { id: 'leather', name: 'Leather Cord' },
  { id: 'chain-silver', name: 'Silver Chain' },
]

// ============================================================================
// HELPERS
// ============================================================================

async function upsertInventoryItem(
  sku: string,
  name: string,
  category: string,
  quantity: number,
  reorderPoint: number
) {
  const existing = await db.query.inventoryItems.findFirst({
    where: eq(inventoryItems.sku, sku),
  })

  if (existing) {
    await db
      .update(inventoryItems)
      .set({ quantity, reorderPoint, updatedAt: new Date() })
      .where(eq(inventoryItems.id, existing.id))
    console.log(`  Updated: ${sku} = ${quantity}`)
  } else {
    await db.insert(inventoryItems).values({
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sku,
      name,
      category,
      quantity,
      reservedQuantity: 0,
      reorderPoint,
    })
    console.log(`  Created: ${sku} = ${quantity}`)
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function seed() {
  console.log('🌱 Seeding Oil Amor inventory...\n')

  // Oils
  console.log('📦 Essential Oils (in stock):')
  for (const oil of STOCKED_OILS) {
    for (const size of BOTTLE_SIZES) {
      await upsertInventoryItem(
        `OIL-${oil.id.toUpperCase().replace(/-/g, '')}-${size.toUpperCase()}`,
        `${oil.name} ${size}`,
        'oil',
        30, // 30 units in stock
        10  // reorder at 10
      )
    }
  }

  console.log('\n📦 Essential Oils (preorder):')
  for (const oil of PREORDER_OILS) {
    for (const size of BOTTLE_SIZES) {
      await upsertInventoryItem(
        `OIL-${oil.id.toUpperCase().replace(/-/g, '')}-${size.toUpperCase()}`,
        `${oil.name} ${size}`,
        'oil',
        0,  // 0 stock = preorder
        10
      )
    }
  }

  // Bottles
  console.log('\n🫙 Bottles:')
  for (const size of BOTTLE_SIZES) {
    await upsertInventoryItem(
      `BOTTLE-${size.toUpperCase()}`,
      `${size} MIRON Violetglass Bottle`,
      'bottle',
      150,
      30
    )
  }

  // Caps
  console.log('\n🔧 Caps & Pipettes:')
  await upsertInventoryItem('CAP-STANDARD', 'Standard Cap/Pipette', 'cap', 200, 50)

  // Crystals
  console.log('\n💎 Crystals:')
  for (const crystal of CRYSTALS) {
    await upsertInventoryItem(
      `CRYSTAL-${crystal.id.toUpperCase().replace(/-/g, '')}`,
      crystal.name,
      'crystal',
      80,
      20
    )
  }

  // Cords
  console.log('\n🧵 Cords:')
  for (const cord of CORDS) {
    await upsertInventoryItem(
      `CORD-${cord.id.toUpperCase().replace(/-/g, '')}`,
      cord.name,
      'cord',
      60,
      15
    )
  }

  console.log('\n✅ Inventory seeding complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
