/**
 * Australia Post Shipping Integration
 * Handles return label generation and tracking for Forever Bottle refills
 */

import { env } from '@/env';
import { db } from '@/lib/db';
import { ausPostShipments, type InsertAusPostShipment } from '@/lib/db/schema-refill';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logging/logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Address {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string; // Australian state code (VIC, NSW, QLD, etc.)
  postcode: string;
  country: string; // ISO 3166-1 alpha-2 code
}

export interface AusPostLabel {
  trackingNumber: string;
  labelUrl: string;
  expiresAt: Date;
  shipmentId: string;
}

export interface TrackingEvent {
  timestamp: Date;
  location: string;
  description: string;
  status: string;
}

export interface TrackingResult {
  status: 'pending' | 'in-transit' | 'delivered' | 'exception';
  events: TrackingEvent[];
  estimatedDelivery?: Date;
}

export interface AusPostWebhookPayload {
  trackingNumber: string;
  timestamp: string;
  eventType: 'shipment.created' | 'shipment.updated' | 'shipment.delivered' | 'shipment.exception';
  currentStatus: string;
  location?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ShipmentRequest {
  from: Address;
  to: Address;
  parcels: Array<{
    length: number;
    width: number;
    height: number;
    weight: number;
  }>;
  shipmentReference?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AUSPOST_API_BASE = env.AUSPOST_API_BASE || 'https://digitalapi.auspost.com.au/shipping/v1';
const AUSPOST_API_KEY = env.AUSPOST_API_KEY;
const AUSPOST_API_SECRET = env.AUSPOST_API_SECRET;
const AUSPOST_ACCOUNT_NUMBER = env.AUSPOST_ACCOUNT_NUMBER;

const LABEL_EXPIRY_DAYS = 30;

// Oil Amor warehouse address (return destination)
const OIL_AMOR_WAREHOUSE: Address = {
  name: 'Oil Amor',
  company: 'Oil Amor Pty Ltd',
  addressLine1: '132 Colorado Dr',
  city: 'Blue Haven',
  state: 'NSW',
  postcode: '2262',
  country: 'AU',
};

// ============================================================================
// API CLIENT
// ============================================================================

/**
 * Make authenticated request to Australia Post API
 */
async function ausPostRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${AUSPOST_API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Account-Number': AUSPOST_ACCOUNT_NUMBER || '',
    ...(options.headers as Record<string, string> || {}),
  };

  // Add authentication if credentials are available
  if (AUSPOST_API_KEY && AUSPOST_API_SECRET) {
    const auth = Buffer.from(`${AUSPOST_API_KEY}:${AUSPOST_API_SECRET}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Australia Post API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// LABEL GENERATION
// ============================================================================

/**
 * Generate a return label for a Forever Bottle
 */
export async function generateReturnLabel(
  customerAddress: Address,
  bottleId: string,
  options?: {
    shipmentReference?: string;
    emailNotification?: boolean;
  }
): Promise<AusPostLabel> {
  // Validate customer address
  if (!customerAddress.postcode || !customerAddress.state) {
    throw new Error('Customer address must include postcode and state');
  }

  // Create shipment request
  const shipmentRequest: ShipmentRequest = {
    from: customerAddress,
    to: OIL_AMOR_WAREHOUSE,
    parcels: [
      {
        length: 8, // cm
        width: 8,
        height: 12,
        weight: 0.3, // kg (bottle + packaging)
      },
    ],
    shipmentReference: options?.shipmentReference || `REFILL-${bottleId}`,
  };

  try {
    // Call Australia Post API to create shipment
    const response = await ausPostRequest<{
      shipments: Array<{
        shipment_id: string;
        tracking_number: string;
        labels?: Array<{
          label_url: string;
          format: string;
        }>;
      }>;
    }>('/shipments', {
      method: 'POST',
      body: JSON.stringify({
        shipments: [{
          from: {
            name: shipmentRequest.from.name,
            lines: [
              shipmentRequest.from.addressLine1,
              shipmentRequest.from.addressLine2,
            ].filter(Boolean),
            suburb: shipmentRequest.from.city,
            state: shipmentRequest.from.state,
            postcode: shipmentRequest.from.postcode,
            country: shipmentRequest.from.country,
            email: shipmentRequest.from.email,
            phone: shipmentRequest.from.phone,
          },
          to: {
            name: shipmentRequest.to.name,
            business_name: shipmentRequest.to.company,
            lines: [shipmentRequest.to.addressLine1],
            suburb: shipmentRequest.to.city,
            state: shipmentRequest.to.state,
            postcode: shipmentRequest.to.postcode,
            country: shipmentRequest.to.country,
          },
          items: shipmentRequest.parcels.map((parcel) => ({
            product_id: 'T25S', // Small satchel or equivalent
            length: parcel.length,
            width: parcel.width,
            height: parcel.height,
            weight: parcel.weight,
            description: 'Forever Bottle Return',
          })),
          shipment_reference: shipmentRequest.shipmentReference,
          customer_references: [bottleId],
          email_tracking_enabled: options?.emailNotification ?? true,
        }],
      }),
    });

    const shipment = response.shipments[0];
    if (!shipment) {
      throw new Error('No shipment created');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + LABEL_EXPIRY_DAYS);

    // Get the PDF label URL
    const labelUrl = shipment.labels?.find((l) => l.format === 'PDF')?.label_url 
      || shipment.labels?.[0]?.label_url 
      || '';

    // Store shipment in database
    const shipmentRecord: InsertAusPostShipment = {
      id: nanoid(),
      bottleId,
      trackingNumber: shipment.tracking_number,
      shipmentId: shipment.shipment_id,
      labelUrl,
      status: 'pending',
      fromAddress: customerAddress,
      toAddress: OIL_AMOR_WAREHOUSE,
      createdAt: new Date(),
      expiresAt,
    };

    await db.insert(ausPostShipments).values(shipmentRecord);

    return {
      trackingNumber: shipment.tracking_number,
      labelUrl,
      expiresAt,
      shipmentId: shipment.shipment_id,
    };
  } catch (error) {
    logger.error('Failed to generate Australia Post label', error instanceof Error ? error : new Error(String(error)));
    
    // Fallback: Generate a simulated label for development/testing only
    if (env.NODE_ENV === 'development') {
      return generateSimulatedLabel(bottleId, customerAddress);
    }
    
    throw error;
  }
}

/**
 * Generate a simulated label for development/testing
 */
function generateSimulatedLabel(
  bottleId: string,
  customerAddress: Address
): AusPostLabel {
  const trackingNumber = `TEST${Date.now().toString(36).toUpperCase()}`;
  const shipmentId = `sim-${nanoid(8)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + LABEL_EXPIRY_DAYS);

  // Create a data URL for a simple label
  const labelData = {
    trackingNumber,
    from: customerAddress,
    to: OIL_AMOR_WAREHOUSE,
    reference: `REFILL-${bottleId}`,
    generatedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const labelUrl = `data:application/json;base64,${Buffer.from(JSON.stringify(labelData)).toString('base64')}`;

  return {
    trackingNumber,
    labelUrl,
    expiresAt,
    shipmentId,
  };
}

// ============================================================================
// SHIPPING RATES
// ============================================================================

export interface AusPostRate {
  service_code: string
  service_name: string
  total_cost: number // in cents
  delivery_time: string
}

/**
 * Calculate parcel weight in kg from cart items
 */
export function calculateParcelWeight(itemCount: number, hasCustomBlends: boolean): number {
  // Base packaging weight
  let weightKg = 0.08
  
  // Per bottle weight
  if (itemCount === 1) weightKg += 0.04
  else if (itemCount === 2) weightKg += 0.12
  else if (itemCount === 3) weightKg += 0.20
  else if (itemCount === 4) weightKg += 0.28
  else weightKg += 0.05 * itemCount
  
  // Custom blends with crystals/cords add a bit more
  if (hasCustomBlends) {
    weightKg += 0.02
  }
  
  // Round to 2 decimal places, minimum 0.1kg for AusPost
  return Math.max(0.1, Math.round(weightKg * 100) / 100)
}

/**
 * Get live shipping rates from Australia Post
 */
export async function getLiveShippingRates(
  toPostcode: string,
  weightKg: number
): Promise<AusPostRate[]> {
  const rates: AusPostRate[] = []
  
  try {
    // Use AusPost postage calculation API
    const url = new URL(`https://digitalapi.auspost.com.au/postage/parcel/domestic/service.json`)
    url.searchParams.set('from_postcode', OIL_AMOR_WAREHOUSE.postcode)
    url.searchParams.set('to_postcode', toPostcode)
    url.searchParams.set('length', '15')
    url.searchParams.set('width', '12')
    url.searchParams.set('height', '8')
    url.searchParams.set('weight', String(weightKg))
    
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Account-Number': AUSPOST_ACCOUNT_NUMBER || '',
        ...(AUSPOST_API_KEY && AUSPOST_API_SECRET ? {
          'Authorization': `Basic ${Buffer.from(`${AUSPOST_API_KEY}:${AUSPOST_API_SECRET}`).toString('base64')}`,
        } : {}),
      },
    })
    
    if (response.ok) {
      const data = await response.json() as {
        services?: {
          service?: Array<{
            code: string
            name: string
            price: string
            delivery_time: string
          }>
        }
      }
      
      const services = data.services?.service || []
      for (const svc of services) {
        const priceCents = Math.round(parseFloat(svc.price) * 100)
        if (!isNaN(priceCents)) {
          rates.push({
            service_code: svc.code,
            service_name: svc.name,
            total_cost: priceCents,
            delivery_time: svc.delivery_time,
          })
        }
      }
    } else {
    }
  } catch (err) {
    logger.error('[AusPost] Failed to fetch live rates', err instanceof Error ? err : new Error(String(err)));
  }
  
  return rates
}

/**
 * Get best available shipping rate from Australia Post
 * Falls back to default rates if API fails
 */
export async function getBestShippingRate(
  toPostcode: string,
  weightKg: number,
  isExpress: boolean = false
): Promise<{ amount: number; description: string }> {
  const rates = await getLiveShippingRates(toPostcode, weightKg)
  
  if (rates.length > 0) {
    // Prefer standard parcel post for regular, express post for express
    const preferred = isExpress
      ? rates.find(r => r.service_code.includes('EXP')) || rates[0]
      : rates.find(r => r.service_code.includes('PARCEL_POST') || r.service_code.includes('STANDARD')) || rates[0]
    
    return {
      amount: preferred.total_cost,
      description: `${preferred.service_name} (${preferred.delivery_time})`,
    }
  }
  
  // Fallback to defaults
  return {
    amount: isExpress ? 1500 : 1000,
    description: isExpress ? 'Express Shipping (1-2 business days)' : 'Standard Shipping (3-5 business days)',
  }
}

// ============================================================================
// TRACKING
// ============================================================================

/**
 * Track a return shipment
 */
export async function trackReturn(
  trackingNumber: string
): Promise<TrackingResult> {
  try {
    const response = await ausPostRequest<{
      tracking_results: Array<{
        tracking_number: string;
        status: string;
        events: Array<{
          timestamp: string;
          location: string;
          description: string;
          status: string;
        }>;
        estimated_delivery_date?: string;
      }>;
    }>(`/tracking?q=${encodeURIComponent(trackingNumber)}`);

    const result = response.tracking_results[0];
    if (!result) {
      throw new Error('Tracking number not found');
    }

    // Map AusPost status to our status
    const statusMap: Record<string, TrackingResult['status']> = {
      'Created': 'pending',
      'Pending': 'pending',
      'Picked Up': 'in-transit',
      'In Transit': 'in-transit',
      'Delivered': 'delivered',
      'Exception': 'exception',
      'Return to Sender': 'exception',
    };

    return {
      status: statusMap[result.status] || 'pending',
      events: result.events.map((event) => ({
        timestamp: new Date(event.timestamp),
        location: event.location,
        description: event.description,
        status: event.status,
      })),
      estimatedDelivery: result.estimated_delivery_date 
        ? new Date(result.estimated_delivery_date) 
        : undefined,
    };
  } catch (error) {
    logger.error('Failed to track shipment', error instanceof Error ? error : new Error(String(error)));

    // Fallback: Return simulated tracking for development
    if (env.NODE_ENV === 'development' || !AUSPOST_API_KEY) {
      return getSimulatedTracking(trackingNumber);
    }

    throw error;
  }
}

/**
 * Get simulated tracking data for development
 */
function getSimulatedTracking(trackingNumber: string): TrackingResult {
  // Generate deterministic but varied results based on tracking number
  const hash = trackingNumber.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  const events: TrackingEvent[] = [];
  const now = new Date();

  // Always have a created event
  events.push({
    timestamp: new Date(now.getTime() - 86400000 * 2),
    location: 'Customer Location',
    description: 'Shipping label created',
    status: 'Created',
  });

  // Randomly add more events
  if (Math.abs(hash) % 3 !== 0) {
    events.push({
      timestamp: new Date(now.getTime() - 86400000),
      location: 'Melbourne VIC',
      description: 'Item picked up from sender',
      status: 'Picked Up',
    });
  }

  if (Math.abs(hash) % 5 === 0) {
    events.push({
      timestamp: new Date(now.getTime() - 43200000),
      location: 'Melbourne VIC',
      description: 'Item processed at facility',
      status: 'In Transit',
    });
  }

  if (Math.abs(hash) % 7 === 0) {
    events.push({
      timestamp: new Date(now.getTime() - 3600000),
      location: 'Melbourne VIC 3000',
      description: 'Delivered',
      status: 'Delivered',
    });
  }

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const currentStatus = events[0]?.status || 'Created';
  const statusMap: Record<string, TrackingResult['status']> = {
    'Created': 'pending',
    'Picked Up': 'in-transit',
    'In Transit': 'in-transit',
    'Delivered': 'delivered',
  };

  return {
    status: statusMap[currentStatus] || 'pending',
    events,
    estimatedDelivery: Math.abs(hash) % 7 !== 0 
      ? new Date(now.getTime() + 86400000) 
      : undefined,
  };
}

/**
 * Verify if a bottle has been received (delivered)
 */
export async function verifyBottleReceived(
  trackingNumber: string
): Promise<boolean> {
  try {
    const tracking = await trackReturn(trackingNumber);
    return tracking.status === 'delivered';
  } catch (error) {
    logger.error('Failed to verify bottle receipt', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get shipment by tracking number
 */
export async function getShipmentByTrackingNumber(
  trackingNumber: string
) {
  const shipment = await db.query.ausPostShipments.findFirst({
    where: eq(ausPostShipments.trackingNumber, trackingNumber),
  });

  return shipment;
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle Australia Post tracking webhook
 */
export async function handleTrackingWebhook(
  payload: AusPostWebhookPayload
): Promise<{
  bottleId: string;
  status: TrackingResult['status'];
  actionRequired?: 'apply-credit' | 'process-return';
}> {
  const { trackingNumber, eventType, currentStatus } = payload;

  // Get shipment from database
  const shipment = await getShipmentByTrackingNumber(trackingNumber);
  if (!shipment) {
    throw new Error(`Shipment not found for tracking number: ${trackingNumber}`);
  }

  // Update shipment status in database
  await db
    .update(ausPostShipments)
    .set({
      status: mapWebhookStatus(currentStatus) as 'pending' | 'in-transit' | 'delivered' | 'exception' | 'cancelled',
      lastEvent: {
        timestamp: payload.timestamp,
        status: currentStatus,
        location: payload.location,
        description: payload.description,
      },
      updatedAt: new Date(),
    })
    .where(eq(ausPostShipments.trackingNumber, trackingNumber));

  // Map webhook status to our status
  const statusMap: Record<string, TrackingResult['status']> = {
    'Created': 'pending',
    'Pending': 'pending',
    'Picked Up': 'in-transit',
    'In Transit': 'in-transit',
    'Delivered': 'delivered',
    'Exception': 'exception',
  };

  const mappedStatus = statusMap[currentStatus] || 'pending';

  return {
    bottleId: shipment.bottleId,
    status: mappedStatus,
    actionRequired: mappedStatus === 'delivered' ? 'apply-credit' : undefined,
  };
}

/**
 * Map webhook status to internal status
 */
function mapWebhookStatus(status: string): 'pending' | 'in-transit' | 'delivered' | 'exception' | 'cancelled' {
  const statusMap: Record<string, 'pending' | 'in-transit' | 'delivered' | 'exception' | 'cancelled'> = {
    'Created': 'pending',
    'Pending': 'pending',
    'Picked Up': 'in-transit',
    'In Transit': 'in-transit',
    'Delivered': 'delivered',
    'Exception': 'exception',
    'Cancelled': 'cancelled',
  };

  return statusMap[status] || 'exception';
}

// ============================================================================
// LABEL MANAGEMENT
// ============================================================================

/**
 * Get active return label for a bottle
 */
export async function getActiveReturnLabel(
  bottleId: string
): Promise<AusPostLabel | null> {
  const shipment = await db.query.ausPostShipments.findFirst({
    where: eq(ausPostShipments.bottleId, bottleId),
    orderBy: (shipments, { desc }) => [desc(shipments.createdAt)],
  });

  if (!shipment) return null;

  // Check if label is expired
  if (new Date() > new Date(shipment.expiresAt)) {
    return null;
  }

  return {
    trackingNumber: shipment.trackingNumber,
    labelUrl: shipment.labelUrl,
    expiresAt: new Date(shipment.expiresAt),
    shipmentId: shipment.shipmentId,
  };
}

/**
 * Cancel a return label
 */
export async function cancelReturnLabel(
  trackingNumber: string
): Promise<boolean> {
  try {
    // Call Australia Post API to cancel shipment
    await ausPostRequest(`/shipments/${trackingNumber}/cancel`, {
      method: 'POST',
    });

    // Update database
    await db
      .update(ausPostShipments)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(ausPostShipments.trackingNumber, trackingNumber));

    return true;
  } catch (error) {
    logger.error('Failed to cancel return label', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Regenerate an expired return label
 */
export async function regenerateReturnLabel(
  bottleId: string,
  customerAddress: Address
): Promise<AusPostLabel> {
  // Check for existing active label
  const existingLabel = await getActiveReturnLabel(bottleId);
  if (existingLabel) {
    // Cancel existing label
    await cancelReturnLabel(existingLabel.trackingNumber);
  }

  // Generate new label
  return generateReturnLabel(customerAddress, bottleId);
}


// ============================================================================
// OUTBOUND SHIPPING LABELS (Warehouse → Customer)
// ============================================================================

/**
 * Generate an outbound shipping label for a customer order
 * This creates a shipment from Oil Amor warehouse to the customer
 */
export async function generateOutboundLabel(
  customerAddress: Address,
  orderReference: string,
  options?: {
    weightKg?: number;
    dimensions?: { length: number; width: number; height: number };
    serviceCode?: string;
    description?: string;
    emailNotification?: boolean;
  }
): Promise<AusPostLabel & { cost?: number }> {
  // Validate customer address
  if (!customerAddress.postcode || !customerAddress.state) {
    throw new Error('Customer address must include postcode and state');
  }

  const weight = options?.weightKg || 0.3;
  const dims = options?.dimensions || { length: 15, width: 12, height: 8 };

  const shipmentRequest: ShipmentRequest = {
    from: OIL_AMOR_WAREHOUSE,
    to: customerAddress,
    parcels: [
      {
        length: dims.length,
        width: dims.width,
        height: dims.height,
        weight,
      },
    ],
    shipmentReference: orderReference,
  };

  try {
    const response = await ausPostRequest<{
      shipments: Array<{
        shipment_id: string;
        tracking_number: string;
        labels?: Array<{
          label_url: string;
          format: string;
        }>;
        shipment_summary?: {
          total_cost: number;
        };
      }>;
    }>('/shipments', {
      method: 'POST',
      body: JSON.stringify({
        shipments: [{
          from: {
            name: shipmentRequest.from.name,
            business_name: shipmentRequest.from.company,
            lines: [
              shipmentRequest.from.addressLine1,
              shipmentRequest.from.addressLine2,
            ].filter(Boolean),
            suburb: shipmentRequest.from.city,
            state: shipmentRequest.from.state,
            postcode: shipmentRequest.from.postcode,
            country: shipmentRequest.from.country,
            email: shipmentRequest.from.email,
            phone: shipmentRequest.from.phone,
          },
          to: {
            name: shipmentRequest.to.name,
            lines: [
              shipmentRequest.to.addressLine1,
              shipmentRequest.to.addressLine2,
            ].filter(Boolean),
            suburb: shipmentRequest.to.city,
            state: shipmentRequest.to.state,
            postcode: shipmentRequest.to.postcode,
            country: shipmentRequest.to.country,
            email: shipmentRequest.to.email,
            phone: shipmentRequest.to.phone,
          },
          items: [{
            product_id: options?.serviceCode || 'T25S',
            length: dims.length,
            width: dims.width,
            height: dims.height,
            weight,
            description: options?.description || 'Oil Amor Order',
          }],
          shipment_reference: shipmentRequest.shipmentReference,
          customer_references: [orderReference],
          email_tracking_enabled: options?.emailNotification ?? true,
        }],
      }),
    });

    const shipment = response.shipments[0];
    if (!shipment) {
      throw new Error('No shipment created');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + LABEL_EXPIRY_DAYS);

    const labelUrl = shipment.labels?.find((l) => l.format === 'PDF')?.label_url 
      || shipment.labels?.[0]?.label_url 
      || '';

    return {
      trackingNumber: shipment.tracking_number,
      labelUrl,
      expiresAt,
      shipmentId: shipment.shipment_id,
      cost: shipment.shipment_summary?.total_cost,
    };
  } catch (error) {
    logger.error('Failed to generate outbound Australia Post label', error instanceof Error ? error : new Error(String(error)));
    
    // Fallback: Generate a simulated label for development/testing only
    if (env.NODE_ENV === 'development') {
      const simulated = generateSimulatedLabel(orderReference, customerAddress);
      return { ...simulated, cost: 1000 };
    }
    
    throw error;
  }
}

/**
 * Calculate parcel dimensions and weight for an order
 */
export function calculateOrderParcel(orderItems: Array<{ quantity: number; type?: string }>): {
  weightKg: number;
  dimensions: { length: number; width: number; height: number };
} {
  const itemCount = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const hasCustomBlends = orderItems.some(item => item.type === 'custom-mix');
  
  const weightKg = calculateParcelWeight(itemCount, hasCustomBlends);
  
  // Dimensions based on item count
  let dimensions = { length: 15, width: 12, height: 5 };
  if (itemCount >= 5) {
    dimensions = { length: 31, width: 22, height: 12 };
  } else if (itemCount >= 3) {
    dimensions = { length: 22, width: 18, height: 10 };
  }
  
  return { weightKg, dimensions };
}

/**
 * Validate an Australian address against basic rules
 */
export function validateAustralianAddress(address: Address): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!address.name) errors.push('Name is required');
  if (!address.addressLine1) errors.push('Street address is required');
  if (!address.city) errors.push('Suburb/City is required');
  if (!address.state) errors.push('State is required');
  if (!address.postcode) errors.push('Postcode is required');
  
  // Validate Australian postcode format
  if (address.postcode && !/^\d{4}$/.test(address.postcode)) {
    errors.push('Australian postcode must be 4 digits');
  }
  
  // Validate state
  const validStates = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
  if (address.state && !validStates.includes(address.state.toUpperCase())) {
    errors.push(`State must be one of: ${validStates.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}
