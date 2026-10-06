/**
 * Atelier Reorder URLs
 *
 * Builds `/mixing-atelier?blend=<base64 JSON>` prefill links so a batch
 * (from a QR scan) or a past custom-mix order item can be re-created in
 * the atelier with one click. The payload format is the one
 * `useAtelierState` already understands (useAtelierState.ts mount effect).
 *
 * The base64 payload is encodeURIComponent-escaped because the atelier
 * loader reads it via URLSearchParams, which treats a raw '+' as a space.
 */

import type { OrderCustomMix } from '@/lib/db/schema/orders';
import type { BatchRecord } from '@/lib/batch/records';
import { ATELIER_CRYSTALS } from '@/lib/atelier/atelier-engine';
import { CORD_WISDOM } from '@/lib/atelier/living-blend-codex';

interface AtelierPrefillPayload {
  oils: { oilId: string; ml: number }[];
  mode: 'pure' | 'carrier';
  bottleSize: number;
  carrierRatio?: number;
  carrierOilId?: string;
  crystalId?: string;
  cordId?: string;
  name?: string;
}

function encodePayload(payload: AtelierPrefillPayload): string {
  const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `/mixing-atelier?blend=${encodeURIComponent(base64)}`;
}

function findCrystalId(crystalName?: string): string | undefined {
  if (!crystalName) return undefined;
  const needle = crystalName.toLowerCase();
  return ATELIER_CRYSTALS.find(c => c.name.toLowerCase() === needle)?.id;
}

function findCordId(cord?: string): string | undefined {
  if (!cord) return undefined;
  const needle = cord.toLowerCase().split(/\s+/)[0];
  const key = Object.keys(CORD_WISDOM).find(k => k.startsWith(needle));
  return key;
}

/** Reorder URL from a live order item's custom-mix spec (full fidelity). */
export function buildAtelierReorderUrlFromMix(mix: OrderCustomMix): string {
  const payload: AtelierPrefillPayload = {
    oils: mix.oils.map(o => ({ oilId: o.oilId, ml: o.ml })),
    mode: mix.mode,
    bottleSize: mix.totalVolume,
  };
  if (mix.mode === 'carrier') {
    if (typeof mix.carrierRatio === 'number') payload.carrierRatio = mix.carrierRatio;
    if (mix.carrierOilId) payload.carrierOilId = mix.carrierOilId;
  }
  if (mix.crystalId) payload.crystalId = mix.crystalId;
  if (mix.cordId) payload.cordId = mix.cordId;
  if (mix.recipeName) payload.name = mix.recipeName;
  return encodePayload(payload);
}

/** Reorder URL from a batch record (QR scan / delivered-email path). */
export function buildAtelierReorderUrlFromRecord(record: BatchRecord): string {
  const payload: AtelierPrefillPayload = {
    oils: record.oils.map(o => ({ oilId: o.oilId, ml: o.ml })),
    mode: record.mode,
    bottleSize: record.size,
  };
  if (record.mode === 'carrier') {
    if (typeof record.carrierPercentage === 'number') payload.carrierRatio = record.carrierPercentage;
    if (record.carrierOil) payload.carrierOilId = record.carrierOil;
  }
  const crystalId = findCrystalId(record.crystal);
  if (crystalId) payload.crystalId = crystalId;
  const cordId = findCordId(record.cord);
  if (cordId) payload.cordId = cordId;
  if (record.blendName) payload.name = record.blendName;
  return encodePayload(payload);
}
