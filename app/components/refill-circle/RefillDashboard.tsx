'use client';

/**
 * RefillDashboard - Main customer dashboard for Forever Bottle refill program
 * Displays bottles, credits, tracking, and environmental impact
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { ForeverBottleCard } from './ForeverBottleCard';
import { ReturnTrackingCard } from './ReturnTrackingCard';
import { EnvironmentalImpactStats } from './EnvironmentalImpactStats';
import { OrderRefillModal } from './OrderRefillModal';

import type { ForeverBottle } from '@/lib/refill/forever-bottle';
import type { RefillOrder } from '@/lib/refill/return-workflow';
import type { CreditSummary } from '@/lib/refill/credits';
import type { RefillEligibility } from '@/lib/refill/eligibility';

// ============================================================================
// TYPES
// ============================================================================

interface RefillDashboardProps {
  customerId: string;
}

interface DashboardData {
  bottles: ForeverBottle[];
  orders: RefillOrder[];
  credits: CreditSummary;
  eligibility: RefillEligibility;
  environmentalImpact: {
    totalBottlesSaved: number;
    totalGlassRecycled: number;
    totalOilKept: number;
    treesEquivalent: number;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RefillDashboard({ customerId }: RefillDashboardProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [selectedBottle, setSelectedBottle] = useState<ForeverBottle | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'bottles' | 'tracking' | 'credits' | 'impact'>('bottles');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/refill/dashboard?customerId=${customerId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchDashboardData();
  }, [customerId, fetchDashboardData]);

  // Handle refill order
  const handleOrderRefill = (bottle: ForeverBottle) => {
    setSelectedBottle(bottle);
    setIsOrderModalOpen(true);
  };

  // Handle generate label
  const handleGenerateLabel = async (bottle: ForeverBottle) => {
    try {
      const response = await fetch('/api/refill/generate-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bottleId: bottle.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate label');
      }

      const result = await response.json();
      
      // Open label in new tab or download
      if (result.labelUrl) {
        window.open(result.labelUrl, '_blank');
      }

      // Refresh dashboard
      fetchDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate label');
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsOrderModalOpen(false);
    setSelectedBottle(null);
    fetchDashboardData();
  };

  // Filter bottles by status
  const activeBottles = data?.bottles.filter(
    (b) => b.status === 'active' || b.status === 'refilled'
  ) || [];
  
  const inTransitBottles = data?.bottles.filter(
    (b) => b.status === 'in-transit'
  ) || [];
  
  const emptyBottles = data?.bottles.filter(
    (b) => b.status === 'empty'
  ) || [];

  // Filter active orders
  const activeOrders = data?.orders.filter(
    (o) => ['pending-return', 'in-transit', 'received', 'inspecting', 'refilling'].includes(o.status)
  ) || [];

  if (loading) {
    return <RefillDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-800">Error Loading Dashboard</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Check if refill program is unlocked
  if (!data?.eligibility.customerStatus.isUnlocked) {
    return <UnlockPrompt eligibility={data!.eligibility} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forever Bottle Refill Program</h1>
          <p className="text-gray-600">
            Manage your refillable bottles, track returns, and view your environmental impact
          </p>
        </div>
        <CreditBalanceCard 
          credits={data!.credits} 
          onViewHistory={() => setActiveTab('credits')}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'bottles', label: 'My Bottles', count: data!.bottles.length },
            { id: 'tracking', label: 'Tracking', count: activeOrders.length },
            { id: 'credits', label: 'Credits', count: data!.credits.expiringSoon > 0 ? '!' : undefined },
            { id: 'impact', label: 'Impact', badge: undefined },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium
                ${activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  {tab.count}
                </span>
              )}
              {tab.count === '!' && (
                <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700">
                  !
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'bottles' && (
          <BottlesTab
            activeBottles={activeBottles}
            inTransitBottles={inTransitBottles}
            emptyBottles={emptyBottles}
            onOrderRefill={handleOrderRefill}
            onGenerateLabel={handleGenerateLabel}
          />
        )}

        {activeTab === 'tracking' && (
          <TrackingTab
            orders={activeOrders}
            bottles={data!.bottles}
          />
        )}

        {activeTab === 'credits' && (
          <CreditsTab
            credits={data!.credits}
            customerId={customerId}
          />
        )}

        {activeTab === 'impact' && (
          <EnvironmentalImpactStats
            bottlesSaved={data!.environmentalImpact.totalBottlesSaved}
            glassRecycledKg={data!.environmentalImpact.totalGlassRecycled}
            oilKeptLiters={data!.environmentalImpact.totalOilKept}
            treesEquivalent={data!.environmentalImpact.treesEquivalent}
          />
        )}
      </div>

      {/* Order Refill Modal */}
      {selectedBottle && (
        <OrderRefillModal
          isOpen={isOrderModalOpen}
          onClose={handleModalClose}
          bottle={selectedBottle}
          eligibility={data!.eligibility}
          customerId={customerId}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function BottlesTab({
  activeBottles,
  inTransitBottles,
  emptyBottles,
  onOrderRefill,
  onGenerateLabel,
}: {
  activeBottles: ForeverBottle[];
  inTransitBottles: ForeverBottle[];
  emptyBottles: ForeverBottle[];
  onOrderRefill: (bottle: ForeverBottle) => void;
  onGenerateLabel: (bottle: ForeverBottle) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Active Bottles */}
      {activeBottles.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Active Bottles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeBottles.map((bottle) => (
              <ForeverBottleCard
                key={bottle.id}
                bottle={bottle}
                onOrderRefill={() => onOrderRefill(bottle)}
                onGenerateLabel={() => onGenerateLabel(bottle)}
              />
            ))}
          </div>
        </section>
      )}

      {/* In Transit */}
      {inTransitBottles.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">In Transit</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inTransitBottles.map((bottle) => (
              <ForeverBottleCard
                key={bottle.id}
                bottle={bottle}
                onOrderRefill={() => {}}
                onGenerateLabel={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty Bottles */}
      {emptyBottles.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Empty - Ready for Refill</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {emptyBottles.map((bottle) => (
              <ForeverBottleCard
                key={bottle.id}
                bottle={bottle}
                onOrderRefill={() => onOrderRefill(bottle)}
                onGenerateLabel={() => onGenerateLabel(bottle)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {activeBottles.length === 0 && inTransitBottles.length === 0 && emptyBottles.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No Forever Bottles yet</h3>
          <p className="mt-2 text-gray-600">
            Purchase a 100ml Forever Bottle to start your refill journey
          </p>
          <button
            onClick={() => window.location.href = '/products/forever-bottle'}
            className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          >
            Shop Forever Bottles
          </button>
        </div>
      )}
    </div>
  );
}

function TrackingTab({
  orders,
  bottles,
}: {
  orders: RefillOrder[];
  bottles: ForeverBottle[];
}) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-600">No active return shipments</p>
        <p className="mt-2 text-sm text-gray-500">
          Order a refill to see tracking information here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const bottle = bottles.find((b) => b.id === order.bottleId);
        return (
          <ReturnTrackingCard
            key={order.id}
            order={order}
            bottle={bottle}
          />
        );
      })}
    </div>
  );
}

function CreditsTab({
  credits,
  customerId,
}: {
  credits: CreditSummary;
  customerId: string;
}) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch(`/api/refill/credits?customerId=${customerId}`);
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchTransactions();
  }, [customerId, fetchTransactions]);

  return (
    <div className="space-y-6">
      {/* Credit Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-emerald-50 p-4">
          <p className="text-sm text-emerald-600">Current Balance</p>
          <p className="text-2xl font-bold text-emerald-900">${credits.currentBalance.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Total Earned</p>
          <p className="text-2xl font-bold text-blue-900">${credits.totalEarned.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-purple-600">Total Used</p>
          <p className="text-2xl font-bold text-purple-900">${credits.totalUsed.toFixed(2)}</p>
        </div>
      </div>

      {/* Expiring Soon Warning */}
      {credits.expiringSoon > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-medium text-amber-900">Credits Expiring Soon</h4>
              <p className="text-sm text-amber-700">
                You have ${credits.expiringSoon.toFixed(2)} in credits expiring within 30 days.
                Order a refill to use them!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Transaction History</h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-gray-500">No transactions yet</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                        t.type === 'earned' ? 'bg-green-100 text-green-800' :
                        t.type === 'used' ? 'bg-blue-100 text-blue-800' :
                        t.type === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium ${
                      t.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {t.amount > 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                      ${t.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UnlockPrompt({ eligibility }: { eligibility: RefillEligibility }) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="mb-2 text-2xl font-bold text-gray-900">Unlock the Forever Bottle Program</h2>
      <p className="mb-6 text-gray-600">
        Purchase any 30ml essential oil to unlock access to our sustainable refill program.
        Save money and reduce waste with every refill!
      </p>
      <div className="flex justify-center gap-4">
        <button
          onClick={() => window.location.href = '/products/essential-oils-30ml'}
          className="rounded-md bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
        >
          Shop 30ml Oils
        </button>
        <button
          onClick={() => window.location.href = '/refill-program'}
          className="rounded-md border border-emerald-600 px-6 py-3 font-medium text-emerald-600 hover:bg-emerald-50"
        >
          Learn More
        </button>
      </div>
    </div>
  );
}

function CreditBalanceCard({ 
  credits, 
  onViewHistory 
}: { 
  credits: CreditSummary;
  onViewHistory: () => void;
}) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Credit Balance</p>
          <p className="text-2xl font-bold text-emerald-600">${credits.currentBalance.toFixed(2)}</p>
        </div>
        <button
          onClick={onViewHistory}
          className="rounded-md bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-200"
        >
          View History
        </button>
      </div>
      {credits.expiringSoon > 0 && (
        <p className="mt-2 text-xs text-amber-600">
          ${credits.expiringSoon.toFixed(2)} expiring soon
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

function RefillDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex animate-pulse flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-4 w-96 rounded bg-gray-200" />
        </div>
        <div className="h-16 w-40 rounded bg-gray-200" />
      </div>
      <div className="h-12 rounded bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
