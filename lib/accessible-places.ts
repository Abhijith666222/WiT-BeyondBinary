/**
 * Fetches wheelchair-accessible and accessibility-friendly places near a location
 * using OpenStreetMap Overpass API (no API key required).
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export interface AccessiblePlace {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  distance?: number;
  tags?: Record<string, string>;
}

export async function fetchAccessiblePlaces(
  lat: number,
  lon: number,
  radiusMeters = 1000
): Promise<AccessiblePlace[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["wheelchair"="yes"](around:${radiusMeters},${lat},${lon});
      node["wheelchair"="limited"](around:${radiusMeters},${lat},${lon});
      node["toilets:wheelchair"="yes"](around:${radiusMeters},${lat},${lon});
      way["wheelchair"="yes"](around:${radiusMeters},${lat},${lon});
      way["wheelchair"="limited"](around:${radiusMeters},${lat},${lon});
    );
    out body center;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error("Failed to fetch places");
  const json = await res.json();

  const places: AccessiblePlace[] = [];
  const seen = new Set<string>();

  function addPlace(el: {
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }) {
    const plat = el.lat ?? el.center?.lat;
    const plon = el.lon ?? el.center?.lon;
    if (plat == null || plon == null) return;

    const name =
      el.tags?.name ??
      el.tags?.["addr:street"] ??
      el.tags?.amenity ??
      el.tags?.shop ??
      "Unnamed place";
    const type =
      el.tags?.amenity ??
      el.tags?.shop ??
      el.tags?.tourism ??
      el.tags?.["toilets:wheelchair"] ??
      "place";

    const id = `${el.id}-${plat}-${plon}`;
    if (seen.has(id)) return;
    seen.add(id);

    const distance = haversine(lat, lon, plat, plon);

    places.push({
      id,
      name: String(name),
      type: String(type),
      lat: plat,
      lon: plon,
      distance: Math.round(distance),
      tags: el.tags,
    });
  }

  for (const el of json.elements ?? []) {
    addPlace(el);
  }

  places.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  return places.slice(0, 10);
}

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
