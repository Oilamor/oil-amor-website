import {
  BOTTLE_CRYSTAL_MAPPING,
  getCrystalCountForBottle,
  getCrystalWeightForBottle,
  getBottleDescription,
  getCrystalConfigForBottle,
  getAllBottleConfigs,
  isValidBottleSize,
  getBottleSizeOptions,
  getNextBottleSize,
  getPreviousBottleSize,
  compareBottleSizes,
  calculateCrystalCount,
  type BottleSize,
} from '../crystal-config'

describe('Crystal Config', () => {
  describe('BOTTLE_CRYSTAL_MAPPING', () => {
    it('should have all bottle sizes defined', () => {
      expect(BOTTLE_CRYSTAL_MAPPING).toHaveProperty('5ml')
      expect(BOTTLE_CRYSTAL_MAPPING).toHaveProperty('10ml')
      expect(BOTTLE_CRYSTAL_MAPPING).toHaveProperty('15ml')
      expect(BOTTLE_CRYSTAL_MAPPING).toHaveProperty('20ml')
      expect(BOTTLE_CRYSTAL_MAPPING).toHaveProperty('30ml')
    })

    it('should have correct crystal counts', () => {
      expect(BOTTLE_CRYSTAL_MAPPING['5ml'].count).toBe(2)
      expect(BOTTLE_CRYSTAL_MAPPING['10ml'].count).toBe(4)
      expect(BOTTLE_CRYSTAL_MAPPING['15ml'].count).toBe(6)
      expect(BOTTLE_CRYSTAL_MAPPING['20ml'].count).toBe(8)
      expect(BOTTLE_CRYSTAL_MAPPING['30ml'].count).toBe(12)
    })

    it('should have correct weights', () => {
      expect(BOTTLE_CRYSTAL_MAPPING['5ml'].weight).toBe(8)
      expect(BOTTLE_CRYSTAL_MAPPING['10ml'].weight).toBe(15)
      expect(BOTTLE_CRYSTAL_MAPPING['30ml'].weight).toBe(50)
    })
  })

  describe('getCrystalCountForBottle', () => {
    it('should return correct count for each size', () => {
      expect(getCrystalCountForBottle('5ml')).toBe(2)
      expect(getCrystalCountForBottle('15ml')).toBe(6)
      expect(getCrystalCountForBottle('30ml')).toBe(12)
    })

    it('should return default for invalid size', () => {
      expect(getCrystalCountForBottle('invalid' as BottleSize)).toBe(4)
    })
  })

  describe('getCrystalWeightForBottle', () => {
    it('should return correct weight for each size', () => {
      expect(getCrystalWeightForBottle('5ml')).toBe(8)
      expect(getCrystalWeightForBottle('30ml')).toBe(50)
    })

    it('should return default for invalid size', () => {
      expect(getCrystalWeightForBottle('invalid' as BottleSize)).toBe(15)
    })
  })

  describe('getBottleDescription', () => {
    it('should return correct description for each size', () => {
      expect(getBottleDescription('5ml')).toBe('Crystal Tease')
      expect(getBottleDescription('10ml')).toBe('Crystal Whisper')
      expect(getBottleDescription('15ml')).toBe('Crystal Touch')
      expect(getBottleDescription('20ml')).toBe('Crystal Nest')
      expect(getBottleDescription('30ml')).toBe('Crystal Garden')
    })
  })

  describe('getCrystalConfigForBottle', () => {
    it('should return complete config', () => {
      const config = getCrystalConfigForBottle('15ml')
      expect(config).toEqual({
        count: 6,
        weight: 25,
        description: 'Crystal Touch',
      })
    })
  })

  describe('getAllBottleConfigs', () => {
    it('should return all bottle configs', () => {
      const configs = getAllBottleConfigs()
      expect(configs).toHaveLength(5)
      expect(configs[0].size).toBe('5ml')
      expect(configs[4].size).toBe('30ml')
    })
  })

  describe('isValidBottleSize', () => {
    it('should return true for valid sizes', () => {
      expect(isValidBottleSize('5ml')).toBe(true)
      expect(isValidBottleSize('30ml')).toBe(true)
    })

    it('should return false for invalid sizes', () => {
      expect(isValidBottleSize('50ml')).toBe(false)
      expect(isValidBottleSize('')).toBe(false)
    })
  })

  describe('getBottleSizeOptions', () => {
    it('should return options for UI', () => {
      const options = getBottleSizeOptions()
      expect(options).toHaveLength(5)
      expect(options[0]).toHaveProperty('value')
      expect(options[0]).toHaveProperty('label')
      expect(options[0]).toHaveProperty('description')
      expect(options[0]).toHaveProperty('crystalCount')
    })
  })

  describe('getNextBottleSize', () => {
    it('should return next larger size', () => {
      expect(getNextBottleSize('5ml')).toBe('10ml')
      expect(getNextBottleSize('10ml')).toBe('15ml')
      expect(getNextBottleSize('15ml')).toBe('20ml')
      expect(getNextBottleSize('20ml')).toBe('30ml')
    })

    it('should return null for largest size', () => {
      expect(getNextBottleSize('30ml')).toBeNull()
    })
  })

  describe('getPreviousBottleSize', () => {
    it('should return previous smaller size', () => {
      expect(getPreviousBottleSize('30ml')).toBe('20ml')
      expect(getPreviousBottleSize('20ml')).toBe('15ml')
      expect(getPreviousBottleSize('15ml')).toBe('10ml')
      expect(getPreviousBottleSize('10ml')).toBe('5ml')
    })

    it('should return null for smallest size', () => {
      expect(getPreviousBottleSize('5ml')).toBeNull()
    })
  })

  describe('compareBottleSizes', () => {
    it('should return -1 for smaller size', () => {
      expect(compareBottleSizes('5ml', '10ml')).toBe(-1)
    })

    it('should return 1 for larger size', () => {
      expect(compareBottleSizes('30ml', '5ml')).toBe(1)
    })

    it('should return 0 for same size', () => {
      expect(compareBottleSizes('15ml', '15ml')).toBe(0)
    })
  })

  describe('calculateCrystalCount', () => {
    it('should calculate with default multiplier', () => {
      expect(calculateCrystalCount('10ml')).toBe(4)
    })

    it('should calculate with custom multiplier', () => {
      expect(calculateCrystalCount('10ml', 2)).toBe(8)
      expect(calculateCrystalCount('5ml', 1.5)).toBe(3)
    })
  })
})
