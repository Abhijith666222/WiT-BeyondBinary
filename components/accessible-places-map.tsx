"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import type { AccessiblePlace } from "@/lib/accessible-places";
import { OSMFallbackMap } from "@/components/osm-fallback-map";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const mapContainerStyle = { width: "100%", height: "100%", minHeight: "280px", borderRadius: "1rem" };

interface AccessiblePlacesMapProps {
  lat: number;
  lon: number;
  places: AccessiblePlace[];
  selectedId: string | null;
  onSelectPlace: (place: AccessiblePlace) => void;
}

function GoogleMapInner({
  lat,
  lon,
  places,
  selectedId,
  onSelectPlace,
}: AccessiblePlacesMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const center = useMemo(() => ({ lat, lng: lon }), [lat, lon]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setCenter(center);
    map.setZoom(15);
  }, [center]);

  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const place = places.find((p) => p.id === selectedId);
    if (place) {
      mapRef.current.setCenter({ lat: place.lat, lng: place.lon });
      mapRef.current.setZoom(16);
    }
  }, [selectedId, places]);

  if (loadError) {
    return <OSMFallbackMap lat={lat} lon={lon} places={places} selectedId={selectedId} onSelectPlace={onSelectPlace} />;
  }

  if (!isLoaded) {
    return (
      <div
        className="flex h-full min-h-[280px] w-full items-center justify-center rounded-2xl border border-[rgba(230,180,200,0.35)] bg-[#F4EEF6]"
        aria-label="Loading map"
      >
        <span className="text-sm text-[#6B6B6B]">Loading map…</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={15}
      onLoad={onMapLoad}
      options={{
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      }}
    >
      {places.map((place) => (
        <Marker
          key={place.id}
          position={{ lat: place.lat, lng: place.lon }}
          title={place.name}
          onClick={() => onSelectPlace(place)}
        />
      ))}
    </GoogleMap>
  );
}

export function AccessiblePlacesMap(props: AccessiblePlacesMapProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return <OSMFallbackMap {...props} />;
  }
  return <GoogleMapInner {...props} />;
}
