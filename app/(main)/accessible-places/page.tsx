"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback, useMemo } from "react";
import { MapPin, Volume2, VolumeX, Loader2, RefreshCw, Heart, Store, Users } from "lucide-react";
import womensPlacesData from "@/data/womens_places.json";
import { fetchAccessiblePlaces, type AccessiblePlace } from "@/lib/accessible-places";
import { getCachedPlaces, setCachedPlaces } from "@/lib/places-cache";
import { speak, stopSpeaking, setOnSpeechFinished } from "@/lib/voice/tts";

const AccessiblePlacesMap = dynamic(
  () => import("@/components/accessible-places-map").then((m) => ({ default: m.AccessiblePlacesMap })),
  { ssr: false, loading: () => <div className="h-full min-h-[320px] rounded-2xl bg-[#F4EEF6] flex items-center justify-center text-sm text-[#6B6B6B]">Loading map…</div> }
);

interface WomensPlace {
  name: string;
  type: string;
  category: string;
  description: string;
}

const womensPlaces = womensPlacesData as WomensPlace[];

function formatType(t: string) {
  return t.replace(/_/g, " ").replace(/^([a-z])/, (_, c: string) => c.toUpperCase());
}

export default function AccessiblePlacesPage() {
  const [places, setPlaces] = useState<AccessiblePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [womensFilter, setWomensFilter] = useState<"all" | "women-owned" | "womens-health" | "support">("all");
  const [womensSearch, setWomensSearch] = useState("");

  const filteredWomensPlaces = useMemo(() => {
    let list = [...womensPlaces];
    if (womensFilter !== "all") {
      list = list.filter((p) => p.type === womensFilter);
    }
    const q = womensSearch.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));
    return list;
  }, [womensFilter, womensSearch]);

  const loadPlaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setPosition({ lat, lon });
        try {
          const results = await fetchAccessiblePlaces(lat, lon, 1200);
          setPlaces(results);
          setSelectedId(null);
          setCachedPlaces({ places: results, position: { lat, lon } });
        } catch (e) {
          setError("Could not load places. Please try again.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location access denied. Please enable location to find places near you.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    const cached = getCachedPlaces();
    if (cached) {
      setPlaces(cached.places);
      setPosition(cached.position);
    } else {
      loadPlaces();
    }
  }, []);

  const handleReadAll = useCallback(() => {
    if (places.length === 0) return;
    setIsReading(true);
    stopSpeaking();
    const prevCb = setOnSpeechFinished(null);
    let i = 0;
    const sayNext = () => {
      if (i >= places.length) {
        setOnSpeechFinished(prevCb);
        setIsReading(false);
        return;
      }
      const p = places[i];
      const dist = p.distance ? `about ${p.distance} metres away` : "";
      speak(`${i + 1}. ${p.name}, ${formatType(p.type)}. ${dist}.`, "normal");
      i++;
      setOnSpeechFinished(sayNext);
    };
    sayNext();
  }, [places]);

  const handleStopRead = useCallback(() => {
    stopSpeaking();
    setOnSpeechFinished(null);
    setIsReading(false);
  }, []);

  const handleReadPlace = useCallback((place: AccessiblePlace) => {
    stopSpeaking();
    const dist = place.distance ? `about ${place.distance} metres away` : "";
    speak(`${place.name}, ${place.type}. ${dist}.`, "normal");
  }, []);

  const handleReadWomensPlace = useCallback((p: WomensPlace) => {
    stopSpeaking();
    speak(`${p.name}, ${p.description}.`, "normal");
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      {/* Sidebar — list of places */}
      <aside
        className="flex w-full flex-col border-r border-[rgba(230,180,200,0.35)] bg-[#FAF4F7]/95 md:w-80 md:min-w-80"
        aria-label="Accessible places near you"
      >
        <div className="border-b border-[rgba(230,180,200,0.35)] p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#2A2433]">
            <MapPin className="h-5 w-5 text-brand-rose" strokeWidth={1.5} />
            Accessible Places Near You
          </h2>
          <p className="mt-1 text-xs text-[#6B6B6B]">
            Wheelchair-accessible locations. Tap Refresh to reload.
          </p>
          <div className="mt-3 flex gap-2">
            {isReading ? (
              <button
                type="button"
                onClick={handleStopRead}
                data-voice-action="stop-read-places"
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-red-500/30 px-4 py-2.5 text-sm font-medium text-red-700 transition-all hover:bg-red-500/50"
                aria-label="Stop reading"
              >
                <VolumeX className="h-4 w-4" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReadAll}
                disabled={loading || places.length === 0}
                data-voice-action="read-all-places"
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-pink/30 px-4 py-2.5 text-sm font-medium text-brand-rose transition-all hover:bg-brand-pink/50 disabled:opacity-50"
                aria-label="Read all places aloud"
              >
                <Volume2 className="h-4 w-4" />
                Read all aloud
              </button>
            )}
            <button
              type="button"
              onClick={loadPlaces}
              disabled={loading}
              data-voice-action="refresh-places"
              className="flex min-h-[44px] items-center justify-center rounded-xl bg-brand-pink/20 px-3 py-2.5 text-brand-rose transition-all hover:bg-brand-pink/40 disabled:opacity-50"
              aria-label="Refresh places"
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-rose" />
              <p className="text-sm text-[#6B6B6B]">Finding places near you…</p>
            </div>
          )}
          {error && (
            <p className="px-4 py-6 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && places.length === 0 && (
            <p className="px-4 py-6 text-sm text-[#6B6B6B]">
              No accessible places found in this area. Try a different location.
            </p>
          )}
          {!loading && places.length > 0 && (
            <ul className="space-y-1">
              {places.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(place.id);
                      handleReadPlace(place);
                    }}
                    className={`w-full rounded-xl px-3 py-3 text-left transition-all min-h-[52px] flex flex-col gap-0.5 ${
                      selectedId === place.id
                        ? "bg-brand-pink/30 ring-2 ring-brand-rose/30"
                        : "hover:bg-brand-pink/15"
                    }`}
                    aria-label={`${place.name}, ${place.type}, ${place.distance ? place.distance + " metres away" : ""}. Tap to hear.`}
                  >
                    <span className="font-medium text-[#2A2433]">{place.name}</span>
                    <span className="text-xs text-[#6B6B6B]">
                      {formatType(place.type)}
                      {place.distance != null && ` · ${place.distance}m`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <details open className="mt-4 px-2 border-t border-[rgba(230,180,200,0.35)] pt-4">
            <summary className="cursor-pointer text-sm font-medium text-[#2A2433] flex items-center gap-2 py-2">
              <Heart className="h-4 w-4 text-brand-rose" />
              Women-focused services
            </summary>
            <div className="mt-2 space-y-2">
              <input
                type="text"
                placeholder="Search women-focused services…"
                value={womensSearch}
                onChange={(e) => setWomensSearch(e.target.value)}
                className="w-full rounded-lg border border-[rgba(230,180,200,0.35)] bg-[#FAF4F7] px-3 py-2 text-sm"
                aria-label="Search women-focused services"
                data-voice-field="search"
              />
              <div className="flex flex-wrap gap-1">
                {(["all", "women-owned", "womens-health", "support"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setWomensFilter(f)}
                    data-voice-action={f === "all" ? "womens-filter-all" : `womens-filter-${f}`}
                    className={`rounded-lg px-2 py-1 text-xs font-medium ${
                      womensFilter === f ? "bg-brand-pink/30 text-brand-rose" : "bg-white/60 text-[#6B6B6B] hover:bg-brand-pink/15"
                    }`}
                  >
                    {f === "all" ? "All" : f === "women-owned" ? "Women-owned" : f === "womens-health" ? "Women's health" : "Support"}
                  </button>
                ))}
              </div>
              {filteredWomensPlaces.length === 0 ? (
                <p className="text-xs text-[#6B6B6B] py-2">No matching services. Try a different filter or search.</p>
              ) : (
                <ul className="space-y-1">
                  {filteredWomensPlaces.map((p) => (
                    <li key={`${p.name}-${p.type}`}>
                      <button
                        type="button"
                        onClick={() => handleReadWomensPlace(p)}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-brand-pink/15 transition-colors"
                      >
                        <span className="font-medium text-[#2A2433]">{p.name}</span>
                        <span className="block text-xs text-[#6B6B6B]">{p.description}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1 p-4">
        <div className="h-full min-h-[320px] rounded-2xl overflow-hidden">
          {position && (
            <AccessiblePlacesMap
              lat={position.lat}
              lon={position.lon}
              places={places}
              selectedId={selectedId}
              onSelectPlace={(place) => {
                setSelectedId(place.id);
                handleReadPlace(place);
              }}
            />
          )}
          {loading && !position && (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl bg-[#F4EEF6]">
              <Loader2 className="h-10 w-10 animate-spin text-brand-rose" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
