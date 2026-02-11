"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { AccessiblePlace } from "@/lib/accessible-places";

interface OSMFallbackMapProps {
  lat: number;
  lon: number;
  places: AccessiblePlace[];
  selectedId: string | null;
  onSelectPlace: (place: AccessiblePlace) => void;
}

export function OSMFallbackMap({ lat, lon, places, selectedId, onSelectPlace }: OSMFallbackMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{ map: L.Map; markers: L.Marker[] } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;
    let mounted = true;
    import("leaflet").then((L) => {
      if (!mounted || !mapRef.current || !L.default) return;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
      const map = L.default.map(mapRef.current).setView([lat, lon], 15);
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      leafletRef.current = { map, markers: [] };
    });
    return () => {
      mounted = false;
      const leaflet = leafletRef.current;
      if (leaflet) {
        leaflet.map.remove();
        leafletRef.current = null;
      }
    };
  }, [lat, lon]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    if (!leaflet) return;
    leaflet.markers.forEach((m) => m.remove());
    leaflet.markers.length = 0;
    import("leaflet").then((L) => {
      if (!L.default || !leafletRef.current) return;
      places.forEach((place) => {
        const m = L.default
          .marker([place.lat, place.lon])
          .addTo(leafletRef.current!.map)
          .on("click", () => onSelectPlace(place));
        leafletRef.current!.markers.push(m);
      });
    });
  }, [places, onSelectPlace]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    if (!leaflet || !selectedId) return;
    const place = places.find((p) => p.id === selectedId);
    if (place) leaflet.map.setView([place.lat, place.lon], 16);
  }, [selectedId, places]);

  return (
    <div
      ref={mapRef}
      className="h-full min-h-[280px] w-full rounded-2xl border border-[rgba(230,180,200,0.35)] bg-[#F4EEF6] [&_.leaflet-container]:rounded-2xl"
      aria-label="Map showing accessible places (OpenStreetMap)"
    />
  );
}
