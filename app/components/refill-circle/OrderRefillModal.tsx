'use client';

/**
 * OrderRefillModal - Modal for ordering a bottle refill
 * Multi-step flow: Confirm → Pricing → Label → Success
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logging/logger';

import type { ForeverBottle } from '@/lib/refill/forever-bottle';
import type { RefillEligibility } from '@/lib/refill/eligibility';

// ============================================================================
// TYPES
// ============================================================================

type Step = 'confirm' | 'pricing' | 'address' | 'label' | 'success' | 'error';

interface PricingBreakdown {
  basePrice: number;
  originalPrice: number;
  returnCredit: number;
  availableCredits: number;
  creditsToUse: number;
  finalPrice: number;
  savings: number;
}

interface CustomerAddress {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postcode: string;
  phone: string;
}

interface OrderRefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bottle: ForeverBottle;
  eligibility: RefillEligibility;
  customerId: string;
}

interface OrderResult {
  orderId: string;
  trackingNumber: string;
  labelUrl: string;
  finalPrice: number;
  creditUsed: number;
  checkoutUrl?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: { id: Step; label: string }[] = [
  { id: 'confirm', label: 'Confirm' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'address', label: 'Address' },
  { id: 'label', label: 'Label' },
  { id: 'success', label: 'Done' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OrderRefillModal({
  isOpen,
  onClose,
  bottle,
  eligibility,
  customerId,
}: OrderRefillModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('confirm');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  
  // Form state
  const [useCredits, setUseCredits] = useState(true);
  const [customerAddress, setCustomerAddress] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postcode: '',
    phone: '',
  });

  const fetchCustomerAddress = useCallback(async () => {
    try {
      const response = await fetch(`/api/customer/address?customerId=${customerId}`);
      if (response.ok) {
        const address = await response.json();
        setCustomerAddress(address);
      }
    } catch (err) {
      logger.error('Failed to fetch address:', err instanceof Error ? err : new Error(String(err)));
    }
  }, [customerId]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep('confirm');
      setError(null);
      setOrderResult(null);
      fetchCustomerAddress();
    }
  }, [isOpen, fetchCustomerAddress]);

  // Handle step progression
  const handleNext = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex < STEPS.length - 2) {
      setCurrentStep(STEPS[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].id);
    }
  };

  // Calculate pricing
  const calculatePricing = () => {
    const basePrice = eligibility.pricing.discountedPrice;
    const availableCredits = eligibility.pricing.availableCredits;
    const creditsToUse = useCredits ? Math.min(availableCredits, basePrice) : 0;
    const finalPrice = basePrice - creditsToUse;

    return {
      basePrice,
      originalPrice: eligibility.pricing.standardPrice,
      returnCredit: eligibility.pricing.creditApplied,
      availableCredits,
      creditsToUse,
      finalPrice,
      savings: eligibility.pricing.standardPrice - finalPrice,
    };
  };

  // Submit order
  const handleSubmitOrder = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pricing = calculatePricing();

      const response = await fetch('/api/refill/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          bottleId: bottle.id,
          useCredits,
          customerAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const result = await response.json();
      setOrderResult(result);
      setCurrentStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Close and refresh
  const handleClose = () => {
    onClose();
    router.refresh();
  };

  if (!isOpen) return null;

  const pricing = calculatePricing();
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm
                    pt-[80px] sm:pt-[100px] pb-4 sm:pb-8 overflow-hidden">
      <div className="relative max-h-[calc(100vh-100px)] sm:max-h-[calc(100vh-120px)] w-full max-w-lg 
                      overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Order Refill</h2>
            <button
              onClick={handleClose}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          {currentStep !== 'success' && currentStep !== 'error' && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                {STEPS.slice(0, -1).map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                      <div className={`
                        flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
                        ${index < currentStepIndex ? 'bg-emerald-600 text-white' :
                          index === currentStepIndex ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-600' :
                          'bg-gray-100 text-gray-400'
                        }
                      `}>
                        {index < currentStepIndex ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`
                        mt-1 text-xs
                        ${index <= currentStepIndex ? 'text-emerald-700 font-medium' : 'text-gray-400'}
                      `}>
                        {step.label}
                      </span>
                    </div>
                    {index < STEPS.length - 2 && (
                      <div className={`
                        h-0.5 flex-1 mx-2
                        ${index < currentStepIndex ? 'bg-emerald-600' : 'bg-gray-200'}
                      `} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {currentStep === 'confirm' && (
            <ConfirmStep bottle={bottle} />
          )}

          {currentStep === 'pricing' && (
            <PricingStep
              pricing={pricing}
              useCredits={useCredits}
              onToggleCredits={setUseCredits}
            />
          )}

          {currentStep === 'address' && (
            <AddressStep
              address={customerAddress}
              onChange={setCustomerAddress}
            />
          )}

          {currentStep === 'label' && (
            <LabelPreviewStep
              pricing={pricing}
              onConfirm={handleSubmitOrder}
              isLoading={isLoading}
            />
          )}

          {currentStep === 'success' && orderResult && (
            <SuccessStep
              result={orderResult}
              bottle={bottle}
            />
          )}

          {currentStep === 'error' && (
            <ErrorStep
              error={error || 'An unknown error occurred'}
              onRetry={() => setCurrentStep('label')}
            />
          )}
        </div>

        {/* Footer */}
        {currentStep !== 'success' && currentStep !== 'error' && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <div className="flex justify-between">
              <button
                onClick={currentStep === 'confirm' ? handleClose : handleBack}
                className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-200"
              >
                {currentStep === 'confirm' ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={currentStep === 'label' ? handleSubmitOrder : handleNext}
                disabled={isLoading || (currentStep === 'address' && !isAddressValid(customerAddress))}
                className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : currentStep === 'label' ? (
                  'Confirm Order'
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        )}

        {currentStep === 'error' && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('label')}
                className="flex-1 rounded-lg bg-gray-200 px-6 py-2 font-medium text-gray-700 hover:bg-gray-300"
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function ConfirmStep({ bottle }: { bottle: ForeverBottle }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="mb-2 font-semibold text-emerald-900">Refill Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-emerald-700">Oil Type:</span>
            <span className="font-medium text-emerald-900 capitalize">{bottle.oilType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-700">Bottle:</span>
            <span className="font-medium text-emerald-900">{bottle.capacity} Forever Bottle</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-700">Serial Number:</span>
            <span className="font-mono text-emerald-900">{bottle.serialNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-700">Previous Refills:</span>
            <span className="font-medium text-emerald-900">{bottle.refillCount}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h4 className="mb-2 flex items-center gap-2 font-medium text-amber-900">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How it works
        </h4>
        <ol className="list-inside list-decimal space-y-1 text-sm text-amber-800">
          <li>We&apos;ll generate a prepaid return label</li>
          <li>Package your empty bottle and attach the label</li>
          <li>Drop off at any Australia Post location</li>
          <li>We&apos;ll refill and return your bottle within 5-7 days</li>
          <li>Earn $5 credit for each return!</li>
        </ol>
      </div>
    </div>
  );
}

function PricingStep({
  pricing,
  useCredits,
  onToggleCredits,
}: {
  pricing: PricingBreakdown;
  useCredits: boolean;
  onToggleCredits: (value: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-4 font-semibold text-gray-900">Pricing Breakdown</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Standard Refill Price</span>
            <span className="text-gray-900">${pricing.originalPrice.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm text-emerald-600">
            <span>Return Credit</span>
            <span>-${pricing.returnCredit.toFixed(2)}</span>
          </div>
          
          <div className="border-t border-gray-100 pt-2">
            <div className="flex justify-between font-medium">
              <span className="text-gray-900">Refill Price</span>
              <span className="text-gray-900">${pricing.basePrice.toFixed(2)}</span>
            </div>
          </div>

          {pricing.availableCredits > 0 && (
            <div className="rounded-lg bg-gray-50 p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={useCredits}
                  onChange={(e) => onToggleCredits(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Use Store Credits</span>
                  <p className="text-sm text-gray-600">
                    Apply ${Math.min(pricing.availableCredits, pricing.basePrice).toFixed(2)} from your credit balance
                  </p>
                </div>
              </label>
            </div>
          )}

          {useCredits && pricing.creditsToUse > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Credit Applied</span>
              <span>-${pricing.creditsToUse.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-900">Final Price</span>
              <span className="text-emerald-600">${pricing.finalPrice.toFixed(2)}</span>
            </div>
          </div>

          {pricing.savings > 0 && (
            <div className="rounded-lg bg-emerald-50 p-3 text-center">
              <p className="text-sm font-medium text-emerald-800">
                You save ${pricing.savings.toFixed(2)} with the refill program!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddressStep({
  address,
  onChange,
}: {
  address: CustomerAddress;
  onChange: (address: CustomerAddress) => void;
}) {
  const updateField = (field: keyof typeof address, value: string) => {
    onChange({ ...address, [field]: value });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Enter the address where you&apos;ll be sending the bottle from:
      </p>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            value={address.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Jane Smith"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Street Address</label>
          <input
            type="text"
            value={address.addressLine1}
            onChange={(e) => updateField('addressLine1', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="123 Main Street"
          />
        </div>

        <div>
          <input
            type="text"
            value={address.addressLine2}
            onChange={(e) => updateField('addressLine2', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Apt 4B (optional)"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
            <input
              type="text"
              value={address.city}
              onChange={(e) => updateField('city', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Melbourne"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
            <select
              value={address.state}
              onChange={(e) => updateField('state', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select</option>
              <option value="VIC">VIC</option>
              <option value="NSW">NSW</option>
              <option value="QLD">QLD</option>
              <option value="WA">WA</option>
              <option value="SA">SA</option>
              <option value="TAS">TAS</option>
              <option value="ACT">ACT</option>
              <option value="NT">NT</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Postcode</label>
            <input
              type="text"
              value={address.postcode}
              onChange={(e) => updateField('postcode', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="3000"
              maxLength={4}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={address.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="0412 345 678"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LabelPreviewStep({
  pricing,
  onConfirm,
  isLoading,
}: {
  pricing: PricingBreakdown;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="font-semibold text-emerald-900">Return Label Ready</h3>
        <p className="mt-1 text-sm text-emerald-700">
          We&apos;ll generate a prepaid Australia Post label for your return.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="mb-3 font-medium text-gray-900">Order Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Refill Price</span>
            <span>${pricing.basePrice.toFixed(2)}</span>
          </div>
          {pricing.creditsToUse > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Credit Applied</span>
              <span>-${pricing.creditsToUse.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold">
            <span className="text-gray-900">You&apos;ll Pay</span>
            <span className="text-emerald-600">${pricing.finalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h4 className="mb-2 flex items-center gap-2 font-medium text-amber-900">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Next Steps
        </h4>
        <ol className="list-inside list-decimal space-y-1 text-sm text-amber-800">
          <li>Confirm your order</li>
          <li>Download and print your return label</li>
          <li>Package your bottle securely</li>
          <li>Drop off at any Australia Post location within 30 days</li>
        </ol>
      </div>
    </div>
  );
}

function SuccessStep({
  result,
  bottle,
}: {
  result: OrderResult;
  bottle: ForeverBottle;
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900">Order Confirmed!</h3>
        <p className="mt-1 text-gray-600">
          Your refill order has been placed successfully.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-left">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-emerald-700">Order ID:</span>
            <span className="font-mono font-medium text-emerald-900">{result.orderId.slice(0, 8)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-700">Tracking Number:</span>
            <span className="font-mono font-medium text-emerald-900">{result.trackingNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-700">Amount Paid:</span>
            <span className="font-medium text-emerald-900">${result.finalPrice.toFixed(2)}</span>
          </div>
          {result.creditUsed > 0 && (
            <div className="flex justify-between">
              <span className="text-emerald-700">Credits Used:</span>
              <span className="font-medium text-emerald-900">${result.creditUsed.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {result.checkoutUrl && (
          <a
            href={result.checkoutUrl}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Complete Payment (${result.finalPrice.toFixed(2)})
          </a>
        )}
        <a
          href={result.labelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-3 font-medium text-white hover:bg-gray-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Return Label
        </a>
        <a
          href={`https://auspost.com.au/mypost/track/#/details/${result.trackingNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          Track on Australia Post
        </a>
      </div>
    </div>
  );
}

function ErrorStep({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900">Order Failed</h3>
        <p className="mt-1 text-gray-600">
          We couldn&apos;t process your refill order.
        </p>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isAddressValid(address: CustomerAddress): boolean {
  return !!(
    address.name &&
    address.addressLine1 &&
    address.city &&
    address.state &&
    address.postcode &&
    address.postcode.length === 4
  );
}
