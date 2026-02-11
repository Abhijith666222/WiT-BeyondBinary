/**
 * Simple in-memory cache for accessible places so we don't refetch on every tab visit.
 * Refresh button explicitly reloads and updates the cache.
 */

import type { AccessiblePlace } from "./accessible-places";

export interface PlacesCacheEntry {
  places: AccessiblePlace[];
  position: { lat: number; lon: number };
}

let cache: PlacesCacheEntry | null = null;

export function getCachedPlaces(): PlacesCacheEntry | null {
  return cache;
}

export function setCachedPlaces(entry: PlacesCacheEntry): void {
  cache = entry;
}

export function clearPlacesCache(): void {
  cache = null;
}
