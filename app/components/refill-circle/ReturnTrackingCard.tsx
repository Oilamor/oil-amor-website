'use client';

/**
 * ReturnTrackingCard - Shows tracking status for a return shipment
 * Timeline visualization with status updates
 */

import React, { useState, useEffect, useCallback } from 'react';

import type { RefillOrder } from '@/lib/refill/return-workflow';
import type { ForeverBottle } from '@/lib/refill/forever-bottle';

// ============================================================================
// TYPES
// ============================================================================

interface ReturnTrackingCardProps {
  order: RefillOrder;
  bottle?: ForeverBottle;
}

interface TrackingEvent {
  timestamp: Date;
  location: string;
  description: string;
  status: string;
  completed: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReturnTrackingCard({ order, bottle }: ReturnTrackingCardProps) {
  const [trackingData, setTrackingData] = useState<{
    status: 'pending' | 'in-transit' | 'delivered' | 'exception';
    events: TrackingEvent[];
    estimatedDelivery?: Date;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchTrackingData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/refill/tracking?trackingNumber=${order.returnLabel.trackingNumber}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
      }
    } catch (error) {
      console.error('Failed to fetch tracking:', error);
    } finally {
      setLoading(false);
    }
  }, [order.returnLabel.trackingNumber]);

  useEffect(() => {
    fetchTrackingData();
  }, [order.returnLabel.trackingNumber, fetchTrackingData]);

  const getTimelineSteps = (): TrackingEvent[] => {
    // Combine static steps with actual events
    const steps: TrackingEvent[] = [
      {
        timestamp: new Date(order.createdAt),
        location: 'Your Address',
        description: 'Return label generated',
        status: 'generated',
        completed: true,
      },
      {
        timestamp: new Date(order.createdAt),
        location: 'Pending',
        description: 'Package dropped off at post office',
        status: 'dropped-off',
        completed: order.status !== 'pending-return',
      },
      {
        timestamp: new Date(),
        location: 'In Transit',
        description: 'Bottle on the way to Oil Amor',
        status: 'in-transit',
        completed: ['in-transit', 'received', 'inspecting', 'refilling', 'completed'].includes(order.status),
      },
      {
        timestamp: new Date(),
        location: 'Oil Amor Warehouse',
        description: 'Bottle received and inspected',
        status: 'received',
        completed: ['received', 'inspecting', 'refilling', 'completed'].includes(order.status),
      },
      {
        timestamp: new Date(),
        location: 'Oil Amor Warehouse',
        description: 'Bottle cleaned and refilled',
        status: 'refilled',
        completed: ['refilling', 'completed'].includes(order.status),
      },
      {
        timestamp: order.completedAt ? new Date(order.completedAt) : new Date(),
        location: 'Your Address',
        description: 'Refilled bottle delivered',
        status: 'delivered',
        completed: order.status === 'completed',
      },
    ];

    // If we have actual tracking events, merge them
    if (trackingData?.events) {
      trackingData.events.forEach((event) => {
        const matchingStep = steps.find((s) => 
          event.description.toLowerCase().includes(s.description.toLowerCase())
        );
        if (matchingStep) {
          matchingStep.timestamp = event.timestamp;
          matchingStep.location = event.location;
          matchingStep.completed = true;
        }
      });
    }

    return steps;
  };

  const timelineSteps = getTimelineSteps();
  const currentStepIndex = timelineSteps.findIndex((s) => !s.completed) - 1;
  const effectiveIndex = currentStepIndex < 0 ? timelineSteps.length - 1 : currentStepIndex;

  const getStatusDisplay = () => {
    switch (order.status) {
      case 'pending-return':
        return {
          label: 'Awaiting Drop-off',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          icon: '📦',
        };
      case 'in-transit':
        return {
          label: 'In Transit',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: '🚚',
        };
      case 'received':
        return {
          label: 'Received',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          icon: '✅',
        };
      case 'inspecting':
        return {
          label: 'Under Inspection',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200',
          icon: '🔍',
        };
      case 'refilling':
        return {
          label: 'Being Refilled',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          icon: '💧',
        };
      case 'completed':
        return {
          label: 'Completed',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          icon: '✨',
        };
      default:
        return {
          label: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: '❓',
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className={`rounded-xl border ${status.borderColor} ${status.bgColor} p-4`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{status.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">
              {bottle ? `${bottle.oilType} Refill` : 'Refill Order'}
            </h3>
            <p className="text-sm text-gray-600">
              Order #{order.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.bgColor} ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Tracking Number */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-gray-500">Tracking:</span>
        <a
          href={`https://auspost.com.au/mypost/track/#/details/${order.returnLabel.trackingNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-mono text-sm font-medium text-blue-600 hover:underline"
        >
          {order.returnLabel.trackingNumber}
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Estimated Delivery */}
      {trackingData?.estimatedDelivery && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-gray-600">
            Est. delivery: {formatDate(trackingData.estimatedDelivery)}
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${((effectiveIndex + 1) / timelineSteps.length) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Step {effectiveIndex + 1} of {timelineSteps.length}
        </p>
      </div>

      {/* Timeline */}
      <div className="mt-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          {expanded ? 'Hide' : 'Show'} Timeline
          <svg
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="mt-3 space-y-0">
            {timelineSteps.map((step, index) => (
              <TimelineItem
                key={step.status}
                step={step}
                isActive={index === effectiveIndex}
                isCompleted={index <= effectiveIndex}
                isLast={index === timelineSteps.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <a
          href={order.returnLabel.labelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Label
        </a>
        <a
          href={`https://auspost.com.au/mypost/track/#/details/${order.returnLabel.trackingNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.806-.984A1 1 0 0120 6.62l-4.555-2.277A1 1 0 0114 5.618v10.764a1 1 0 01-.553.894L9 20z" />
          </svg>
          Track
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TimelineItem({
  step,
  isActive,
  isCompleted,
  isLast,
}: {
  step: TrackingEvent;
  isActive: boolean;
  isCompleted: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Connector Line */}
      {!isLast && (
        <div className={`
          absolute ml-2 mt-6 h-full w-0.5
          ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'}
        `} style={{ height: 'calc(100% - 24px)' }} />
      )}

      {/* Dot */}
      <div className="relative flex flex-col items-center">
        <div className={`
          flex h-4 w-4 items-center justify-center rounded-full border-2
          ${isCompleted ? 'border-emerald-500 bg-emerald-500' : ''}
          ${isActive ? 'border-emerald-500 bg-white' : ''}
          ${!isCompleted && !isActive ? 'border-gray-300 bg-white' : ''}
        `}>
          {isCompleted && (
            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`
        flex-1 pb-4
        ${isActive ? 'opacity-100' : ''}
        ${isCompleted ? 'opacity-100' : 'opacity-50'}
      `}>
        <p className={`
          text-sm font-medium
          ${isActive ? 'text-emerald-700' : 'text-gray-900'}
        `}>
          {step.description}
        </p>
        <p className="text-xs text-gray-500">
          {step.location}
        </p>
        {step.completed && (
          <p className="text-xs text-gray-400">
            {formatDate(step.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
