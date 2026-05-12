/**
 * Australia Post Tracking Webhook Handler
 * Processes real-time tracking updates for return shipments
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { handleTrackingWebhook, verifyBottleReceived } from '@/lib/shipping/auspost';
import { processBottleReturn } from '@/lib/refill/return-workflow';

// Use Node.js runtime for crypto support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Webhook secret for AusPost
const AUSPOST_WEBHOOK_SECRET = process.env.AUSPOST_WEBHOOK_SECRET;

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

/**
 * POST /api/webhooks/auspost-tracking
 * Handles incoming tracking webhooks from Australia Post
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Read body text first (can only read request body once)
    const bodyText = await request.text();
    
    // 1. Verify webhook signature (if Australia Post provides one)
    const signature = request.headers.get('X-AusPost-Signature');
    
    if (AUSPOST_WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature(bodyText, signature);
      if (!isValid) {
        console.error('[AusPost Webhook] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // 2. Check for replay attacks (webhook must be within last 10 minutes for AusPost)
    const timestamp = request.headers.get('X-AusPost-Timestamp');
    if (!verifyTimestamp(timestamp)) {
      return NextResponse.json(
        { error: 'Webhook expired' },
        { status: 401 }
      );
    }

    // 3. Parse webhook payload from already-read text
    const payload = JSON.parse(bodyText);
    
    // Validate required fields
    if (!payload.trackingNumber && !payload.tracking_number) {
      return NextResponse.json(
        { error: 'Missing tracking number' },
        { status: 400 }
      );
    }

    const trackingNumber = payload.trackingNumber || payload.tracking_number;

    // 4. Process the webhook
    const result = await handleTrackingWebhook({
      trackingNumber,
      timestamp: payload.timestamp || new Date().toISOString(),
      eventType: payload.eventType || payload.event_type || 'shipment.updated',
      currentStatus: payload.currentStatus || payload.status,
      location: payload.location,
      description: payload.description,
      metadata: payload.metadata,
    });

    // 5. If delivered, automatically process the return
    if (result.status === 'delivered' && result.actionRequired === 'apply-credit') {
      
      try {
        const returnResult = await processBottleReturn(trackingNumber, {
          autoApplyCredit: false,
          skipInspection: false,
        });

        return NextResponse.json({
          success: true,
          processed: true,
          bottleId: result.bottleId,
          creditApplied: returnResult.creditApplied,
        });
      } catch (processError) {
        console.error('[AusPost Webhook] Failed to process return:', processError);
        
        // Still return success to acknowledge webhook
        // The return will be processed manually or by a retry job
        return NextResponse.json({
          success: true,
          processed: false,
          bottleId: result.bottleId,
          error: 'Delivery confirmed but automatic processing failed',
        });
      }
    }

    // 6. Return success response
    return NextResponse.json({
      success: true,
      processed: false,
      bottleId: result.bottleId,
      status: result.status,
      actionRequired: result.actionRequired,
    });

  } catch (error) {
    console.error('[AusPost Webhook] Error processing webhook:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/auspost-tracking
 * Used for webhook verification by Australia Post
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Australia Post may send a verification challenge
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({ 
    status: 'ok',
    service: 'Oil Amor AusPost Webhook',
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify webhook timestamp to prevent replay attacks
 * AusPost webhooks typically arrive within seconds, so 10 min window is generous
 */
function verifyTimestamp(timestamp: string | null): boolean {
  if (!timestamp) {
    console.error('AusPost webhook missing timestamp');
    return false;
  }

  let webhookMs: number;
  
  // Try parsing as Unix timestamp (seconds or milliseconds)
  const numericTime = parseInt(timestamp);
  if (!isNaN(numericTime) && String(timestamp).length <= 13) {
    // Unix timestamp: 10 digits = seconds, 11-13 digits = milliseconds
    webhookMs = String(timestamp).length === 10 
      ? numericTime * 1000 
      : numericTime;
  } else {
    // Try parsing as ISO 8601 string
    const parsed = new Date(timestamp).getTime();
    if (isNaN(parsed)) {
      console.error('AusPost webhook has invalid timestamp');
      return false;
    }
    webhookMs = parsed;
  }
    
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes (AusPost can have delays)

  // Webhook must be within last 10 minutes and not in the future
  return (now - webhookMs) <= maxAge && webhookMs <= now;
}

/**
 * Verify webhook signature from Australia Post
 * Uses HMAC-SHA256 with a shared secret
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!AUSPOST_WEBHOOK_SECRET) {
    // Never bypass signature verification based on environment
    console.error('AusPost webhook verification failed: missing secret');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', AUSPOST_WEBHOOK_SECRET)
      .update(payload, 'utf8')
      .digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[AusPost Webhook] Failed to verify signature:', error);
    return false;
  }
}

// ============================================================================
// PAYLOAD TYPES (for reference)
// ============================================================================

interface AusPostWebhookPayload {
  trackingNumber: string;
  timestamp: string;
  eventType: 'shipment.created' | 'shipment.updated' | 'shipment.delivered' | 'shipment.exception';
  currentStatus: string;
  location?: string;
  description?: string;
  metadata?: {
    shipmentId?: string;
    articleId?: string;
    [key: string]: unknown;
  };
}
