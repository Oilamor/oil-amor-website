'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Baby, 
  Heart, 
  Wind, 
  Pill, 
  AlertCircle, 
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Search,
  X
} from 'lucide-react'
import { useHealthProfile } from '@/lib/context/health-profile-context'
import { MedicalCondition } from '@/lib/safety'
import { cn } from '@/lib/utils'
import { ProfileSelector } from './ProfileSelector'
import { searchMedications, COMMON_MEDICATIONS } from '@/lib/safety/medication-database'
import { searchAllergies, AllergySearchResult } from '@/lib/safety/autocomplete-data'

const MEDICAL_CONDITIONS: { id: MedicalCondition; label: string; icon: string }[] = [
  { id: 'asthma', label: 'Asthma', icon: '🫁' },
  { id: 'epilepsy', label: 'Epilepsy/Seizures', icon: '🧠' },
  { id: 'high-blood-pressure', label: 'High Blood Pressure', icon: '💉' },
  { id: 'low-blood-pressure', label: 'Low Blood Pressure', icon: '🩸' },
  { id: 'heart-disease', label: 'Heart Disease', icon: '❤️' },
  { id: 'diabetes', label: 'Diabetes', icon: '📊' },
  { id: 'liver-disease', label: 'Liver Disease', icon: '🫘' },
  { id: 'kidney-disease', label: 'Kidney Disease', icon: '🫘' },
  { id: 'cancer', label: 'Cancer History', icon: '🎗️' },
  { id: 'autoimmune-disorder', label: 'Autoimmune Disorder', icon: '🛡️' },
  { id: 'bleeding-disorder', label: 'Bleeding Disorder', icon: '🩹' },
  { id: 'dermatitis', label: 'Dermatitis/Eczema', icon: '🔴' },
  { id: 'psoriasis', label: 'Psoriasis', icon: '🔴' },
  { id: 'anxiety-disorder', label: 'Anxiety Disorder', icon: '😰' },
  { id: 'depression', label: 'Depression', icon: '😔' },
  { id: 'insomnia', label: 'Insomnia', icon: '😴' },
  { id: 'hormone-sensitive-condition', label: 'Hormone-Sensitive Condition', icon: '⚕️' },
]

const SKIN_SENSITIVITY_OPTIONS = [
  { id: 'normal', label: 'Normal', description: 'No history of skin reactions' },
  { id: 'sensitive', label: 'Sensitive', description: 'Occasional mild reactions' },
  { id: 'very-sensitive', label: 'Very Sensitive', description: 'Frequent reactions to products' },
  { id: 'allergic-history', label: 'Allergy History', description: 'Known contact allergies' },
]

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'New to essential oils' },
  { id: 'intermediate', label: 'Intermediate', description: 'Some experience with oils' },
  { id: 'advanced', label: 'Advanced', description: 'Regular user, knowledge of safety' },
  { id: 'professional', label: 'Professional', description: 'Aromatherapist or healthcare provider' },
]

interface HealthProfileFormProps {
  onComplete: () => void
  onSkip: () => void
}

// Medication Autocomplete Item
interface MedicationOption {
  genericName: string
  brandNames: string[]
  drugClass: string
}

export function HealthProfileForm({ onComplete, onSkip }: HealthProfileFormProps) {
  const [step, setStep] = useState(1)
  const [medicationInput, setMedicationInput] = useState('')
  const [allergyInput, setAllergyInput] = useState('')
  
  // Autocomplete states
  const [medSuggestions, setMedSuggestions] = useState<typeof COMMON_MEDICATIONS>([])
  const [allergySuggestions, setAllergySuggestions] = useState<AllergySearchResult[]>([])
  const [showMedDropdown, setShowMedDropdown] = useState(false)
  const [showAllergyDropdown, setShowAllergyDropdown] = useState(false)
  const [highlightedMedIndex, setHighlightedMedIndex] = useState(0)
  const [highlightedAllergyIndex, setHighlightedAllergyIndex] = useState(0)
  
  // Refs for click-outside handling
  const medRef = useRef<HTMLDivElement>(null)
  const allergyRef = useRef<HTMLDivElement>(null)
  
  const {
    activeProfile,
    updateProfile,
    addCondition,
    removeCondition,
    addMedication,
    removeMedication,
    addAllergy,
    removeAllergy,
    completeProfile,
  } = useHealthProfile()

  // Get data from active profile
  const {
    age = 25,
    isPregnant = false,
    isBreastfeeding = false,
    isTryingToConceive = false,
    conditions = [],
    medications = [],
    knownAllergies = [],
    skinSensitivity = 'normal',
    respiratorySensitivity = false,
    aromatherapyExperience = 'beginner',
  } = activeProfile?.data || {}

  const totalSteps = 5

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (medRef.current && !medRef.current.contains(event.target as Node)) {
        setShowMedDropdown(false)
      }
      if (allergyRef.current && !allergyRef.current.contains(event.target as Node)) {
        setShowAllergyDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Medication search handler
  const handleMedInputChange = (value: string) => {
    setMedicationInput(value)
    setHighlightedMedIndex(0)
    
    if (value.length >= 2) {
      const results = searchMedications(value)
      setMedSuggestions(results.slice(0, 6))
      setShowMedDropdown(results.length > 0)
    } else {
      setMedSuggestions([])
      setShowMedDropdown(false)
    }
  }

  // Allergy search handler
  const handleAllergyInputChange = (value: string) => {
    setAllergyInput(value)
    setHighlightedAllergyIndex(0)
    
    if (value.length >= 2) {
      const results = searchAllergies(value)
      setAllergySuggestions(results)
      setShowAllergyDropdown(results.length > 0)
    } else {
      setAllergySuggestions([])
      setShowAllergyDropdown(false)
    }
  }

  // Add medication from suggestion
  const selectMedication = (med: typeof COMMON_MEDICATIONS[0]) => {
    const medName = med.brandNames?.[0] || med.genericName
    if (!medications.includes(medName)) {
      addMedication(medName)
    }
    setMedicationInput('')
    setShowMedDropdown(false)
    setMedSuggestions([])
  }

  // Add allergy from suggestion
  const selectAllergy = (allergy: AllergySearchResult) => {
    if (!knownAllergies.includes(allergy.name)) {
      addAllergy(allergy.name)
    }
    setAllergyInput('')
    setShowAllergyDropdown(false)
    setAllergySuggestions([])
  }

  // Keyboard navigation for medication
  const handleMedKeyDown = (e: React.KeyboardEvent) => {
    if (!showMedDropdown) {
      if (e.key === 'Enter' && medicationInput.trim()) {
        e.preventDefault()
        addMedication(medicationInput.trim())
        setMedicationInput('')
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedMedIndex(prev => 
          prev < medSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedMedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (medSuggestions[highlightedMedIndex]) {
          selectMedication(medSuggestions[highlightedMedIndex])
        }
        break
      case 'Escape':
        setShowMedDropdown(false)
        break
    }
  }

  // Keyboard navigation for allergy
  const handleAllergyKeyDown = (e: React.KeyboardEvent) => {
    if (!showAllergyDropdown) {
      if (e.key === 'Enter' && allergyInput.trim()) {
        e.preventDefault()
        addAllergy(allergyInput.trim())
        setAllergyInput('')
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedAllergyIndex(prev => 
          prev < allergySuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedAllergyIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (allergySuggestions[highlightedAllergyIndex]) {
          selectAllergy(allergySuggestions[highlightedAllergyIndex])
        }
        break
      case 'Escape':
        setShowAllergyDropdown(false)
        break
    }
  }

  const handleComplete = () => {
    completeProfile()
    onComplete()
  }

  const steps = [
    // Step 1: Profile Selection & Basic Info
    <div key="step1" className="space-y-6">
      <div>
        <h3 className="text-xl font-medium text-[#f5f3ef] flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-[#c9a227]" />
          Who is this blend for?
        </h3>
        <ProfileSelector />
        <p className="text-xs text-[#a69b8a] mt-2">
          Select an existing profile or create a new one for family members
        </p>
      </div>
      
      <h3 className="text-xl font-medium text-[#f5f3ef] flex items-center gap-2">
        <User className="w-5 h-5 text-[#c9a227]" />
        Basic Information
      </h3>
      
      <div>
        <label className="block text-sm text-[#a69b8a] mb-2">Age</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={age}
            onChange={(e) => activeProfile && updateProfile(activeProfile.id, { age: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-[#0a080c] rounded-lg appearance-none cursor-pointer accent-[#c9a227]"
          />
          <span className="w-16 text-right text-[#f5f3ef] font-medium">{age} yrs</span>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 p-3 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 cursor-pointer hover:border-[#c9a227]/30 transition-colors">
          <input
            type="checkbox"
            checked={isPregnant}
            onChange={(e) => activeProfile && updateProfile(activeProfile.id, { isPregnant: e.target.checked })}
            className="w-5 h-5 rounded bg-[#111] border-[#f5f3ef]/30 text-[#c9a227]"
          />
          <div>
            <p className="text-[#f5f3ef]">Currently Pregnant</p>
            <p className="text-xs text-[#a69b8a]">Some oils are not safe during pregnancy</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 cursor-pointer hover:border-[#c9a227]/30 transition-colors">
          <input
            type="checkbox"
            checked={isBreastfeeding}
            onChange={(e) => activeProfile && updateProfile(activeProfile.id, { isBreastfeeding: e.target.checked })}
            className="w-5 h-5 rounded bg-[#111] border-[#f5f3ef]/30 text-[#c9a227]"
          />
          <div>
            <p className="text-[#f5f3ef]">Breastfeeding</p>
            <p className="text-xs text-[#a69b8a]">Some oils may affect milk supply</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 cursor-pointer hover:border-[#c9a227]/30 transition-colors">
          <input
            type="checkbox"
            checked={isTryingToConceive}
            onChange={(e) => activeProfile && updateProfile(activeProfile.id, { isTryingToConceive: e.target.checked })}
            className="w-5 h-5 rounded bg-[#111] border-[#f5f3ef]/30 text-[#c9a227]"
          />
          <div>
            <p className="text-[#f5f3ef]">Trying to Conceive</p>
            <p className="text-xs text-[#a69b8a]">Extra caution with hormone-affecting oils</p>
          </div>
        </label>
      </div>
    </div>,

    // Step 2: Medical Conditions
    <div key="step2" className="space-y-6">
      <h3 className="text-xl font-medium text-[#f5f3ef] flex items-center gap-2">
        <Heart className="w-5 h-5 text-[#c9a227]" />
        Medical Conditions
      </h3>
      <p className="text-sm text-[#a69b8a]">Select any conditions that apply to you:</p>
      
      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
        {MEDICAL_CONDITIONS.map((condition) => (
          <button
            key={condition.id}
            onClick={() => conditions.includes(condition.id) 
              ? removeCondition(condition.id) 
              : addCondition(condition.id)
            }
            className={cn(
              'p-3 rounded-lg border text-left transition-all',
              conditions.includes(condition.id)
                ? 'bg-[#c9a227]/20 border-[#c9a227] text-[#f5f3ef]'
                : 'bg-[#0a080c] border-[#f5f3ef]/10 text-[#a69b8a] hover:border-[#f5f3ef]/30'
            )}
          >
            <span className="text-lg mr-2">{condition.icon}</span>
            <span className="text-sm">{condition.label}</span>
          </button>
        ))}
      </div>

      {conditions.length > 0 && (
        <div className="p-3 rounded-lg bg-[#c9a227]/10 border border-[#c9a227]/30">
          <p className="text-sm text-[#c9a227]">
            {conditions.length} condition{conditions.length !== 1 && 's'} selected
          </p>
        </div>
      )}
    </div>,

    // Step 3: Medications & Allergies (with autocomplete)
    <div key="step3" className="space-y-6">
      <h3 className="text-xl font-medium text-[#f5f3ef] flex items-center gap-2">
        <Pill className="w-5 h-5 text-[#c9a227]" />
        Medications & Allergies
      </h3>
      
      {/* Medications with Autocomplete */}
      <div ref={medRef} className="relative">
        <label className="block text-sm text-[#a69b8a] mb-2">
          Current Medications
          <span className="text-xs ml-2 text-[#c9a227]">Type to search 100+ medications</span>
        </label>
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a69b8a]" />
            <input
              type="text"
              value={medicationInput}
              onChange={(e) => handleMedInputChange(e.target.value)}
              onKeyDown={handleMedKeyDown}
              onFocus={() => medicationInput.length >= 2 && medSuggestions.length > 0 && setShowMedDropdown(true)}
              placeholder="Search medications (e.g., Warfarin, Eliquis...)"
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none"
            />
            
            {/* Medication Dropdown */}
            <AnimatePresence>
              {showMedDropdown && medSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-1 bg-[#0f0f0f] border border-[#f5f3ef]/20 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                >
                  {medSuggestions.map((med, index) => (
                    <button
                      key={med.genericName}
                      onClick={() => selectMedication(med)}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors border-b border-[#f5f3ef]/5 last:border-0',
                        index === highlightedMedIndex
                          ? 'bg-[#c9a227]/20'
                          : 'hover:bg-[#f5f3ef]/5'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[#f5f3ef] font-medium">
                          {med.brandNames?.[0] || med.genericName}
                        </span>
                        <span className="text-xs text-[#a69b8a] bg-[#f5f3ef]/10 px-2 py-0.5 rounded">
                          {med.drugClass.split('(')[0].trim()}
                        </span>
                      </div>
                      <div className="text-xs text-[#a69b8a] mt-0.5">
                        Generic: {med.genericName}
                        {med.brandNames && med.brandNames.length > 1 && (
                          <span> • Also: {med.brandNames.slice(1, 3).join(', ')}</span>
                        )}
                      </div>
                      {med.affectsBloodClotting && (
                        <div className="text-xs text-red-400 mt-1">
                          ⚠️ Blood thinner - important for oil safety
                        </div>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => {
              if (medicationInput.trim()) {
                addMedication(medicationInput.trim())
                setMedicationInput('')
                setShowMedDropdown(false)
              }
            }}
            className="px-4 py-2 rounded-lg bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors"
          >
            Add
          </button>
        </div>
        
        {/* Selected Medications */}
        <div className="flex flex-wrap gap-2">
          {medications.map((med) => (
            <motion.span 
              key={med} 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-3 py-1.5 rounded-full bg-[#111] border border-[#f5f3ef]/10 text-sm text-[#f5f3ef] flex items-center gap-2"
            >
              {med}
              <button 
                onClick={() => removeMedication(med)} 
                className="text-[#a69b8a] hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </div>
        
        {medications.length === 0 && (
          <p className="text-xs text-[#a69b8a]/60 mt-2">
            No medications added. You can also type any medication name and press Enter.
          </p>
        )}
      </div>

      {/* Allergies with Autocomplete */}
      <div ref={allergyRef} className="relative">
        <label className="block text-sm text-[#a69b8a] mb-2">
          Known Allergies
          <span className="text-xs ml-2 text-[#c9a227]">Oils, ingredients, or botanical families</span>
        </label>
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a69b8a]" />
            <input
              type="text"
              value={allergyInput}
              onChange={(e) => handleAllergyInputChange(e.target.value)}
              onKeyDown={handleAllergyKeyDown}
              onFocus={() => allergyInput.length >= 2 && allergySuggestions.length > 0 && setShowAllergyDropdown(true)}
              placeholder="Search allergies (e.g., Lavender, Citrus, Linalool...)"
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none"
            />
            
            {/* Allergy Dropdown */}
            <AnimatePresence>
              {showAllergyDropdown && allergySuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-1 bg-[#0f0f0f] border border-[#f5f3ef]/20 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                >
                  {allergySuggestions.map((allergy, index) => (
                    <button
                      key={allergy.id}
                      onClick={() => selectAllergy(allergy)}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors border-b border-[#f5f3ef]/5 last:border-0',
                        index === highlightedAllergyIndex
                          ? 'bg-[#c9a227]/20'
                          : 'hover:bg-[#f5f3ef]/5'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[#f5f3ef] font-medium">{allergy.name}</span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          allergy.type === 'essential-oil' && 'bg-purple-500/20 text-purple-400',
                          allergy.type === 'component' && 'bg-blue-500/20 text-blue-400',
                          allergy.type === 'botanical' && 'bg-green-500/20 text-green-400',
                          allergy.type === 'chemical' && 'bg-orange-500/20 text-orange-400',
                        )}>
                          {allergy.type.replace('-', ' ')}
                        </span>
                      </div>
                      {allergy.relatedOils.length > 0 && (
                        <div className="text-xs text-[#a69b8a] mt-1">
                          Related: {allergy.relatedOils.slice(0, 4).join(', ')}
                          {allergy.relatedOils.length > 4 && '...'}
                        </div>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => {
              if (allergyInput.trim()) {
                addAllergy(allergyInput.trim())
                setAllergyInput('')
                setShowAllergyDropdown(false)
              }
            }}
            className="px-4 py-2 rounded-lg bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors"
          >
            Add
          </button>
        </div>
        
        {/* Selected Allergies */}
        <div className="flex flex-wrap gap-2">
          {knownAllergies.map((allergy) => (
            <motion.span 
              key={allergy} 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-sm text-red-400 flex items-center gap-2"
            >
              {allergy}
              <button 
                onClick={() => removeAllergy(allergy)} 
                className="hover:text-red-300 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </div>
        
        {knownAllergies.length === 0 && (
          <p className="text-xs text-[#a69b8a]/60 mt-2">
            No allergies added. You can also type any allergy and press Enter.
          </p>
        )}
      </div>
    </div>,

    // Step 4: Skin & Respiratory
    <div key="step4" className="space-y-6">
      <h3 className="text-xl font-medium text-[#f5f3ef] flex items-center gap-2">
        <Wind className="w-5 h-5 text-[#c9a227]" />
        Skin & Respiratory Sensitivity
      </h3>
      
      <div>
        <label className="block text-sm text-[#a69b8a] mb-3">Skin Sensitivity Level</label>
        <div className="space-y-2">
          {SKIN_SENSITIVITY_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => activeProfile && updateProfile(activeProfile.id, { skinSensitivity: option.id as any })}
              className={cn(
                'w-full p-4 rounded-lg border text-left transition-all',
                skinSensitivity === option.id
                  ? 'bg-[#c9a227]/20 border-[#c9a227]'
                  : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
              )}
            >
              <p className={cn(
                'font-medium',
                skinSensitivity === option.id ? 'text-[#f5f3ef]' : 'text-[#a69b8a]'
              )}>
                {option.label}
              </p>
              <p className="text-sm text-[#a69b8a]">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 p-4 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 cursor-pointer hover:border-[#c9a227]/30 transition-colors">
        <input
          type="checkbox"
          checked={respiratorySensitivity}
          onChange={(e) => activeProfile && updateProfile(activeProfile.id, { respiratorySensitivity: e.target.checked })}
          className="w-5 h-5 rounded bg-[#111] border-[#f5f3ef]/30 text-[#c9a227]"
        />
        <div>
          <p className="text-[#f5f3ef]">Respiratory Sensitivity</p>
          <p className="text-xs text-[#a69b8a]">I have asthma or am sensitive to strong scents</p>
        </div>
      </label>
    </div>,

    // Step 5: Experience Level
    <div key="step5" className="space-y-6">
      <h3 className="text-xl font-medium text-[#f5f3ef] flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[#c9a227]" />
        Aromatherapy Experience
      </h3>
      <p className="text-sm text-[#a69b8a]">This helps us tailor safety warnings to your knowledge level:</p>
      
      <div className="space-y-3">
        {EXPERIENCE_LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => activeProfile && updateProfile(activeProfile.id, { aromatherapyExperience: level.id as any })}
            className={cn(
              'w-full p-4 rounded-lg border text-left transition-all',
              aromatherapyExperience === level.id
                ? 'bg-[#c9a227]/20 border-[#c9a227]'
                : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
            )}
          >
            <p className={cn(
              'font-medium',
              aromatherapyExperience === level.id ? 'text-[#f5f3ef]' : 'text-[#a69b8a]'
            )}>
              {level.label}
            </p>
            <p className="text-sm text-[#a69b8a]">{level.description}</p>
          </button>
        ))}
      </div>

      <div className="p-4 rounded-lg bg-[#2ecc71]/10 border border-[#2ecc71]/30">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-[#2ecc71] mt-0.5" />
          <div>
            <p className="text-sm text-[#f5f3ef] font-medium">Your profile is ready!</p>
            <p className="text-xs text-[#a69b8a]">
              This information helps our safety engine protect you while mixing oils.
              You can update these settings anytime from your account.
            </p>
          </div>
        </div>
      </div>
    </div>,
  ]

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#a69b8a]">Step {step} of {totalSteps}</span>
          <span className="text-xs text-[#c9a227]">{Math.round((step / totalSteps) * 100)}%</span>
        </div>
        <div className="h-1 bg-[#0a080c] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[#c9a227]"
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Form Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="min-h-[400px]"
        >
          {steps[step - 1]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => step === 1 ? onSkip() : setStep(s => s - 1)}
          className="flex items-center gap-2 px-4 py-2 text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 1 ? 'Skip for now' : 'Back'}
        </button>

        {step < totalSteps ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#2ecc71] text-[#0a080c] font-medium hover:bg-[#27ae60] transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Complete
          </button>
        )}
      </div>
    </div>
  )
}
