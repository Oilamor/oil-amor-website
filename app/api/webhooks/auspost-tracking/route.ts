/**
 * Australia Post Tracking Webhook Handler
 * Processes real-time tracking updates for return shipments
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { logger } from '@/lib/logging/logger';
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
    
    // 1. Verify webhook signature. When a secret is configured the signature
    // header is mandatory; without a secret we run unsigned (dev mode only).
    const signature = request.headers.get('X-AusPost-Signature');

    if (AUSPOST_WEBHOOK_SECRET) {
      if (!signature) {
        logger.error('[AusPost Webhook] Missing signature', new Error('Missing signature'));
        return NextResponse.json(
          { error: 'Missing signature' },
          { status: 401 }
        );
      }

      const isValid = verifyWebhookSignature(bodyText, signature);
      if (!isValid) {
        logger.error('[AusPost Webhook] Invalid signature', new Error('Invalid signature'));
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      logger.warn('[AusPost Webhook] AUSPOST_WEBHOOK_SECRET not configured — skipping signature verification (dev mode only)');
    }

    // 2. Replay protection: the timestamp header must fall within a tolerance
    // window of server time — the client-supplied value is never trusted alone
    const timestamp = request.headers.get('X-AusPost-Timestamp');
    const verifiedTimestamp = verifyTimestamp(timestamp);
    if (!verifiedTimestamp) {
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

    // 4. Process the webhook (use the server-validated timestamp, not the
    // unverified payload value)
    const result = await handleTrackingWebhook({
      trackingNumber,
      timestamp: verifiedTimestamp.toISOString(),
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
        logger.error('[AusPost Webhook] Failed to process return', processError instanceof Error ? processError : new Error(String(processError)));
        
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
    logger.error('[AusPost Webhook] Error processing webhook', error instanceof Error ? error : new Error(String(error)));
    
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
 * Verify webhook timestamp against server time to prevent replay attacks.
 * Returns the parsed timestamp when it falls within the tolerance window
 * (10 minutes in the past, 1 minute future clock skew), null otherwise.
 */
function verifyTimestamp(timestamp: string | null): Date | null {
  if (!timestamp) {
    logger.error('AusPost webhook missing timestamp', new Error('Missing timestamp'));
    return null;
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
      logger.error('AusPost webhook has invalid timestamp', new Error('Invalid timestamp'));
      return null;
    }
    webhookMs = parsed;
  }

  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes (AusPost can have delays)
  const maxFutureSkew = 60 * 1000; // 1 minute tolerance for clock skew

  if (now - webhookMs > maxAge || webhookMs - now > maxFutureSkew) {
    logger.error('AusPost webhook timestamp outside tolerance window', new Error('Timestamp outside tolerance window'));
    return null;
  }

  return new Date(webhookMs);
}

/**
 * Verify webhook signature from Australia Post
 * Uses HMAC-SHA256 with a shared secret
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!AUSPOST_WEBHOOK_SECRET) {
    // Never bypass signature verification based on environment
    logger.error('AusPost webhook verification failed: missing secret', new Error('Missing secret'));
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
    logger.error('[AusPost Webhook] Failed to verify signature', error instanceof Error ? error : new Error(String(error)));
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
