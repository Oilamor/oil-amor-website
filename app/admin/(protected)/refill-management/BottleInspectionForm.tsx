'use client';

/**
 * BottleInspectionForm - Form for warehouse staff to inspect returned bottles
 * Comprehensive checklist with automatic credit application on pass
 */

import React, { useState } from 'react';
import { adminFetch } from '@/lib/admin/api';

// ============================================================================
// TYPES
// ============================================================================

interface BottleInspectionFormProps {
  order: {
    id: string;
    bottleId: string;
    bottleSerial: string;
    oilType: string;
    customerId: string;
    customerEmail: string;
    refillCount: number;
  };
  onComplete: () => void;
  onCancel: () => void;
}

interface InspectionChecklist {
  // Structural integrity
  cracks: boolean;
  chips: boolean;
  labelIntact: boolean;
  capThreadsGood: boolean;
  dropperWorking: boolean;
  
  // Cleanliness
  bottleClean: boolean;
  labelCleanable: boolean;
  odorResidue: 'none' | 'slight' | 'strong';
  
  // Cosmetic
  labelCondition: 'excellent' | 'good' | 'fair' | 'poor';
  capCondition: 'excellent' | 'good' | 'fair' | 'poor';
  
  // General
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';
}

interface InspectionResult {
  canRefill: boolean;
  cleaningRequired: boolean;
  damageAssessment?: string;
  recommendedAction: 'refill' | 'retire' | 'repair';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BottleInspectionForm({
  order,
  onComplete,
  onCancel,
}: BottleInspectionFormProps) {
  const [step, setStep] = useState<'scan' | 'checklist' | 'result'>('scan');
  const [scannedSerial, setScannedSerial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<InspectionResult | null>(null);
  
  const [checklist, setChecklist] = useState<InspectionChecklist>({
    cracks: false,
    chips: false,
    labelIntact: true,
    capThreadsGood: true,
    dropperWorking: true,
    bottleClean: true,
    labelCleanable: true,
    odorResidue: 'none',
    labelCondition: 'good',
    capCondition: 'good',
    overallCondition: 'good',
  });

  const [notes, setNotes] = useState('');

  // Validate scanned serial
  const handleScanSubmit = () => {
    if (scannedSerial.toUpperCase() === order.bottleSerial.toUpperCase()) {
      setStep('checklist');
    } else {
      alert('Serial number does not match. Please scan the correct bottle.');
    }
  };

  // Update checklist item
  const updateChecklist = <K extends keyof InspectionChecklist>(
    key: K,
    value: InspectionChecklist[K]
  ) => {
    setChecklist((prev) => ({ ...prev, [key]: value }));
  };

  // Calculate inspection result
  const calculateResult = (): InspectionResult => {
    // Critical failures
    if (checklist.cracks || checklist.chips) {
      return {
        canRefill: false,
        cleaningRequired: false,
        damageAssessment: checklist.cracks 
          ? 'Critical: Bottle has cracks' 
          : 'Critical: Bottle has chips',
        recommendedAction: 'retire',
      };
    }

    // Check overall condition
    const needsRetirement = 
      checklist.overallCondition === 'poor' ||
      checklist.labelCondition === 'poor' ||
      checklist.capCondition === 'poor' ||
      !checklist.capThreadsGood ||
      !checklist.dropperWorking;

    if (needsRetirement) {
      return {
        canRefill: false,
        cleaningRequired: false,
        damageAssessment: 'Bottle condition too poor for safe refill',
        recommendedAction: 'retire',
      };
    }

    // Check if cleaning is required
    const cleaningRequired = 
      !checklist.bottleClean ||
      checklist.odorResidue !== 'none' ||
      !checklist.labelCleanable;

    // Check for retirement based on refill count
    if (order.refillCount >= 50) {
      return {
        canRefill: false,
        cleaningRequired: false,
        damageAssessment: `Maximum refill cycles (${order.refillCount}) reached`,
        recommendedAction: 'retire',
      };
    }

    // Inspection every 10 refills
    if (order.refillCount % 10 === 0 && order.refillCount > 0) {
      // Already doing inspection, continue
    }

    return {
      canRefill: true,
      cleaningRequired,
      recommendedAction: 'refill',
    };
  };

  // Submit inspection
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const inspectionResult = calculateResult();
    setResult(inspectionResult);

    try {
      const response = await adminFetch('/api/admin/refill/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          bottleId: order.bottleId,
          inspectionData: {
            ...checklist,
            notes,
          },
          result: inspectionResult,
        }),
      });

      if (response.ok) {
        setStep('result');
      } else {
        const error = await response.json();
        alert(`Failed to submit inspection: ${error.message}`);
      }
    } catch (error) {
      alert('Failed to submit inspection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    // All required fields should be filled
    return true; // Add validation logic as needed
  };

  // Render scan step
  if (step === 'scan') {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl">
            📷
          </div>
          <h2 className="text-xl font-bold text-gray-900">Scan Bottle</h2>
          <p className="text-sm text-gray-600">
            Scan the serial number on the bottle to begin inspection
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Expected Serial Number
            </label>
            <p className="font-mono text-lg text-gray-900">{order.bottleSerial}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Scan or Type Serial Number
            </label>
            <input
              type="text"
              value={scannedSerial}
              onChange={(e) => setScannedSerial(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScanSubmit()}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-lg uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="FA-XXXXXX"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleScanSubmit}
              disabled={scannedSerial.length < 5}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render result step
  if (step === 'result' && result) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-6 text-center">
          <div className={`
            mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-3xl
            ${result.canRefill ? 'bg-emerald-100' : 'bg-red-100'}
          `}>
            {result.canRefill ? '✅' : '❌'}
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {result.canRefill ? 'Inspection Passed' : 'Inspection Failed'}
          </h2>
          <p className="mt-1 text-gray-600">
            {result.canRefill 
              ? 'Bottle approved for refill' 
              : 'Bottle cannot be refilled'}
          </p>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex justify-between rounded-lg bg-gray-50 px-4 py-3">
            <span className="text-gray-600">Action</span>
            <span className={`font-medium ${
              result.recommendedAction === 'refill' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {result.recommendedAction === 'refill' ? 'Proceed with Refill' :
               result.recommendedAction === 'retire' ? 'Retire Bottle' :
               'Send for Repair'}
            </span>
          </div>

          {result.cleaningRequired && (
            <div className="flex justify-between rounded-lg bg-amber-50 px-4 py-3">
              <span className="text-amber-700">Cleaning Required</span>
              <span className="font-medium text-amber-700">Yes</span>
            </div>
          )}

          {result.damageAssessment && (
            <div className="rounded-lg bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700">Assessment</p>
              <p className="text-sm text-red-600">{result.damageAssessment}</p>
            </div>
          )}

          {result.canRefill && (
            <div className="rounded-lg bg-emerald-50 px-4 py-3">
              <p className="text-sm text-emerald-700">
                <span className="font-medium">$5 credit</span> will be automatically applied to the customer&apos;s account.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onComplete}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700"
        >
          Complete
        </button>
      </div>
    );
  }

  // Render checklist step
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bottle Inspection</h2>
            <p className="text-sm text-gray-600">
              Complete the checklist to assess bottle condition
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-gray-500">{order.bottleSerial}</p>
            <p className="text-sm font-medium capitalize text-gray-900">{order.oilType}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Structural Integrity */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <span>🔧</span>
            Structural Integrity
            <span className="text-xs font-normal text-red-500">*Required</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <CheckboxItem
              label="No cracks"
              checked={!checklist.cracks}
              onChange={(checked) => updateChecklist('cracks', !checked)}
              critical
            />
            <CheckboxItem
              label="No chips"
              checked={!checklist.chips}
              onChange={(checked) => updateChecklist('chips', !checked)}
              critical
            />
            <CheckboxItem
              label="Label intact"
              checked={checklist.labelIntact}
              onChange={(checked) => updateChecklist('labelIntact', checked)}
            />
            <CheckboxItem
              label="Cap threads good"
              checked={checklist.capThreadsGood}
              onChange={(checked) => updateChecklist('capThreadsGood', checked)}
            />
            <CheckboxItem
              label="Dropper working"
              checked={checklist.dropperWorking}
              onChange={(checked) => updateChecklist('dropperWorking', checked)}
            />
          </div>
        </section>

        {/* Cleanliness */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <span>🧼</span>
            Cleanliness
          </h3>
          <div className="space-y-3">
            <CheckboxItem
              label="Bottle is clean"
              checked={checklist.bottleClean}
              onChange={(checked) => updateChecklist('bottleClean', checked)}
            />
            <CheckboxItem
              label="Label is cleanable"
              checked={checklist.labelCleanable}
              onChange={(checked) => updateChecklist('labelCleanable', checked)}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Odor Residue
              </label>
              <div className="flex gap-2">
                {(['none', 'slight', 'strong'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => updateChecklist('odorResidue', level)}
                    className={`
                      flex-1 rounded-lg border px-3 py-2 text-sm capitalize
                      ${checklist.odorResidue === level
                        ? level === 'none'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : level === 'slight'
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Condition Ratings */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <span>⭐</span>
            Condition Ratings
          </h3>
          <div className="space-y-4">
            <RatingItem
              label="Label Condition"
              value={checklist.labelCondition}
              onChange={(value) => updateChecklist('labelCondition', value)}
            />
            <RatingItem
              label="Cap Condition"
              value={checklist.capCondition}
              onChange={(value) => updateChecklist('capCondition', value)}
            />
            <RatingItem
              label="Overall Condition"
              value={checklist.overallCondition}
              onChange={(value) => updateChecklist('overallCondition', value)}
            />
          </div>
        </section>

        {/* Notes */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <span>📝</span>
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Any additional observations..."
          />
        </section>

        {/* Summary Preview */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h4 className="mb-2 text-sm font-medium text-gray-700">Inspection Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Can Refill:</span>
              <span className={calculateResult().canRefill ? 'text-emerald-600' : 'text-red-600'}>
                {calculateResult().canRefill ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cleaning Required:</span>
              <span>{calculateResult().cleaningRequired ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Action:</span>
              <span className="capitalize">{calculateResult().recommendedAction}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || checklist.cracks || checklist.chips}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Inspection'
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function CheckboxItem({
  label,
  checked,
  onChange,
  critical,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  critical?: boolean;
}) {
  return (
    <label className={`
      flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors
      ${checked 
        ? 'border-emerald-500 bg-emerald-50' 
        : critical 
          ? 'border-red-200 bg-red-50' 
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }
    `}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span className={`text-sm ${checked ? 'text-emerald-900' : critical ? 'text-red-700' : 'text-gray-700'}`}>
        {label}
      </span>
      {critical && (
        <span className="ml-auto text-xs text-red-500">*Critical</span>
      )}
    </label>
  );
}

function RatingItem({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: 'excellent' | 'good' | 'fair' | 'poor') => void;
}) {
  const ratings = [
    { value: 'excellent', label: 'Excellent', color: 'bg-emerald-500' },
    { value: 'good', label: 'Good', color: 'bg-blue-500' },
    { value: 'fair', label: 'Fair', color: 'bg-amber-500' },
    { value: 'poor', label: 'Poor', color: 'bg-red-500' },
  ] as const;

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        {ratings.map((rating) => (
          <button
            key={rating.value}
            onClick={() => onChange(rating.value)}
            className={`
              flex-1 rounded-lg border px-2 py-2 text-xs
              ${value === rating.value
                ? `border-transparent text-white ${rating.color}`
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            {rating.label}
          </button>
        ))}
      </div>
    </div>
  );
}
