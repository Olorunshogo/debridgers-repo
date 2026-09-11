import { useEffect, useRef } from "react";

/*
 * Leaflet ships its own stylesheet and marker images and is a real dependency, so both are bundled rather than fetched from unpkg.
 * Pulling them from a CDN meant a slow or blocked network rendered the map with no stylesheet and no marker, which looks like a broken map rather than a failed request.
 */
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/*
 * Parked here after the contact page redesign (docs/Screens) dropped the map
 * from that layout. Kept intact rather than deleted, since Leaflet is a real
 * dependency and this is the only place it's wired up, in case the map gets
 * a new home later.
 */
interface ContactMapProps {
  lat: number;
  lng: number;
  zoom: number;
}

export function ContactMap({ lat, lng, zoom }: ContactMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined" || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
      });

      const map = L.map(mapRef.current).setView([lat, lng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Debridgers - Barnawa Market Road, Kaduna")
        .openPopup();

      /*
       * Leaflet measures its container once, at construction.
       * This one is in a flex column that finishes sizing after the dynamic import resolves, so without this the tiles lay out against a stale height and the map renders part-drawn or grey.
       */
      requestAnimationFrame(() => map.invalidateSize());

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, zoom]);

  /* A concrete minimum height, not just h-full: a flex-column parent can be `lg:h-auto`, so a purely relative height collapses to zero and Leaflet draws nothing. */
  return <div ref={mapRef} className="h-full min-h-96 w-full" />;
}
