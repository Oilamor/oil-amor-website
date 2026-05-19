'use client';

/**
 * Refill Management Admin Dashboard
 * For warehouse staff to manage returns, inspections, and fulfillments
 */

import React, { useState, useEffect } from 'react';
import { BottleInspectionForm } from './BottleInspectionForm';
import { adminFetch } from '@/lib/admin/api';
import { logger } from '@/lib/logging/logger';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'incoming' | 'inspecting' | 'fulfillment' | 'credits' | 'analytics';

interface ReturnOrder {
  id: string;
  customerId: string;
  customerEmail: string;
  bottleId: string;
  bottleSerial: string;
  oilType: string;
  status: string;
  trackingNumber: string;
  createdAt: string;
  receivedAt?: string;
  refillCount: number;
}

interface InspectionResult {
  id: string;
  bottleId: string;
  bottleSerial: string;
  customerId: string;
  customerEmail: string;
  canRefill: boolean;
  cleaningRequired: boolean;
  damageAssessment?: string;
  inspectedAt: string;
  inspectorId: string;
}

interface CreditTransaction {
  id: string;
  customerId: string;
  customerEmail: string;
  type: 'earned' | 'used' | 'adjusted';
  amount: number;
  description: string;
  createdAt: string;
}

interface AnalyticsData {
  totalReturns: number;
  pendingInspections: number;
  completedRefills: number;
  totalCreditsIssued: number;
  averageProcessingTime: number;
  returnRate: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RefillManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await adminFetch('/api/admin/refill/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      logger.error('Failed to fetch analytics', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'incoming' as TabType, label: 'Incoming', icon: '📦', count: analytics?.pendingInspections },
    { id: 'inspecting' as TabType, label: 'Inspecting', icon: '🔍' },
    { id: 'fulfillment' as TabType, label: 'Fulfillment', icon: '✅' },
    { id: 'credits' as TabType, label: 'Credits', icon: '💰' },
    { id: 'analytics' as TabType, label: 'Analytics', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Refill Management</h1>
              <p className="text-sm text-gray-600">Forever Bottle return and refill system</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.open('/admin/refill-management/scan', '_blank')}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Scan Bottle
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      {!loading && analytics && (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <QuickStatCard
              label="Total Returns"
              value={analytics.totalReturns}
              icon="📦"
              color="blue"
            />
            <QuickStatCard
              label="Pending Inspection"
              value={analytics.pendingInspections}
              icon="🔍"
              color="amber"
            />
            <QuickStatCard
              label="Completed"
              value={analytics.completedRefills}
              icon="✅"
              color="emerald"
            />
            <QuickStatCard
              label="Credits Issued"
              value={`$${analytics.totalCreditsIssued.toFixed(0)}`}
              icon="💰"
              color="purple"
            />
            <QuickStatCard
              label="Return Rate"
              value={`${(analytics.returnRate * 100).toFixed(1)}%`}
              icon="📈"
              color="cyan"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium
                  ${activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }
                `}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'incoming' && <IncomingTab />}
        {activeTab === 'inspecting' && <InspectingTab />}
        {activeTab === 'fulfillment' && <FulfillmentTab />}
        {activeTab === 'credits' && <CreditsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function IncomingTab() {
  const [orders, setOrders] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ReturnOrder | null>(null);

  useEffect(() => {
    fetchIncomingOrders();
  }, []);

  const fetchIncomingOrders = async () => {
    try {
      const response = await adminFetch('/api/admin/refill/incoming');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      logger.error('Failed to fetch incoming orders', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReceived = async (orderId: string) => {
    try {
      const response = await adminFetch('/api/admin/refill/mark-received', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (response.ok) {
        fetchIncomingOrders();
      }
    } catch (error) {
      logger.error('Failed to mark received', error instanceof Error ? error : new Error(String(error)));
    }
  };

  if (selectedOrder) {
    return (
      <BottleInspectionForm
        order={selectedOrder}
        onComplete={() => {
          setSelectedOrder(null);
          fetchIncomingOrders();
        }}
        onCancel={() => setSelectedOrder(null)}
      />
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Incoming Returns</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchIncomingOrders}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No incoming returns"
          description="Returns will appear here when tracking shows delivered"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Bottle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tracking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{order.oilType}</p>
                      <p className="text-sm text-gray-500">{order.bottleSerial}</p>
                      <p className="text-xs text-gray-400">{order.refillCount} previous refills</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm text-gray-900">{order.customerEmail}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <a
                      href={`https://auspost.com.au/mypost/track/#/details/${order.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-blue-600 hover:underline"
                    >
                      {order.trackingNumber}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InspectingTab() {
  const [orders, setOrders] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspectingOrders();
  }, []);

  const fetchInspectingOrders = async () => {
    try {
      const response = await adminFetch('/api/admin/refill/inspecting');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      logger.error('Failed to fetch inspecting orders', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Under Inspection</h2>
      
      {orders.length === 0 ? (
        <EmptyState
          icon="✅"
          title="No bottles under inspection"
          description="All caught up!"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <InspectionCard
              key={order.id}
              order={order}
              onRefresh={fetchInspectingOrders}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FulfillmentTab() {
  const [orders, setOrders] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFulfillmentOrders();
  }, []);

  const fetchFulfillmentOrders = async () => {
    try {
      const response = await adminFetch('/api/admin/refill/fulfillment');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      logger.error('Failed to fetch fulfillment orders', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (orderId: string) => {
    try {
      const response = await adminFetch('/api/admin/refill/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (response.ok) {
        fetchFulfillmentOrders();
      }
    } catch (error) {
      logger.error('Failed to complete order', error instanceof Error ? error : new Error(String(error)));
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Ready for Fulfillment</h2>
      
      {orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders to fulfill"
          description="Bottles ready for refilling will appear here"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                  💧
                </div>
                <div>
                  <p className="font-medium text-gray-900 capitalize">{order.oilType}</p>
                  <p className="text-sm text-gray-500">{order.bottleSerial}</p>
                  <p className="text-xs text-gray-400">{order.customerEmail}</p>
                </div>
              </div>
              <button
                onClick={() => handleComplete(order.id)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Mark Complete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreditsTab() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreditTransactions();
  }, []);

  const fetchCreditTransactions = async () => {
    try {
      const response = await adminFetch('/api/admin/refill/credits');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      logger.error('Failed to fetch credit transactions', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Recent Credit Transactions</h2>
      
      {transactions.length === 0 ? (
        <EmptyState
          icon="💰"
          title="No transactions yet"
          description="Credit transactions will appear here"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{t.customerEmail}</td>
                  <td className="px-6 py-4">
                    <CreditTypeBadge type={t.type} />
                  </td>
                  <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium ${
                    t.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await adminFetch('/api/admin/refill/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      logger.error('Failed to fetch analytics', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Program Analytics</h2>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-gray-500">Processing Time</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {analytics.averageProcessingTime.toFixed(1)}
            </span>
            <span className="text-gray-600">days average</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            From receipt to shipment
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-gray-500">Return Rate</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {(analytics.returnRate * 100).toFixed(1)}%
            </span>
            <span className="text-gray-600">of bottles</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Customers using refill program
          </p>
        </div>
      </div>

      {/* Add more analytics visualizations here */}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function QuickStatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'amber' | 'emerald' | 'purple' | 'cyan';
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    purple: 'bg-purple-50 border-purple-200',
    cyan: 'bg-cyan-50 border-cyan-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="mt-1 text-sm text-gray-600">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    'pending-return': {
      label: 'Pending Drop-off',
      className: 'bg-amber-100 text-amber-800',
    },
    'in-transit': {
      label: 'In Transit',
      className: 'bg-blue-100 text-blue-800',
    },
    'received': {
      label: 'Received',
      className: 'bg-purple-100 text-purple-800',
    },
    'inspecting': {
      label: 'Inspecting',
      className: 'bg-indigo-100 text-indigo-800',
    },
    'refilling': {
      label: 'Refilling',
      className: 'bg-emerald-100 text-emerald-800',
    },
    'completed': {
      label: 'Completed',
      className: 'bg-green-100 text-green-800',
    },
  };

  const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function CreditTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    'earned': { label: 'Earned', className: 'bg-green-100 text-green-800' },
    'used': { label: 'Used', className: 'bg-blue-100 text-blue-800' },
    'adjusted': { label: 'Adjusted', className: 'bg-gray-100 text-gray-800' },
  };

  const { label, className } = config[type] || { label: type, className: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function InspectionCard({
  order,
  onRefresh,
}: {
  order: ReturnOrder;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900 capitalize">{order.oilType}</p>
          <p className="text-sm text-gray-500">{order.bottleSerial}</p>
        </div>
        <span className="rounded-full bg-indigo-100 p-2 text-lg">🔍</span>
      </div>
      <p className="mt-2 text-sm text-gray-600">{order.customerEmail}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {/* Open inspection form */}}
          className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Continue Inspection
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
