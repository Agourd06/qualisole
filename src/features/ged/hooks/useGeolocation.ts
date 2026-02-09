import { useCallback, useState } from 'react';

export interface GeoPosition {
  latitude: string;
  longitude: string;
  altitude: string;
  accuracy: string;
  altitudeAccuracy: string;
}

export interface UseGeolocationResult {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  getPosition: () => Promise<GeoPosition | null>;
}

function toPosition(coords: GeolocationPosition): GeoPosition {
  return {
    latitude: String(coords.coords.latitude),
    longitude: String(coords.coords.longitude),
    altitude: coords.coords.altitude != null ? String(coords.coords.altitude) : '',
    accuracy: coords.coords.accuracy != null ? String(coords.coords.accuracy) : '',
    altitudeAccuracy:
      coords.coords.altitudeAccuracy != null ? String(coords.coords.altitudeAccuracy) : '',
  };
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 25000,
  maximumAge: 600000,
};

function getErrorMessage(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) return 'Permission denied';
  if (err.code === err.POSITION_UNAVAILABLE) return 'Position unavailable';
  if (err.code === err.TIMEOUT) return 'Location request timed out';
  return err.message || 'Geolocation error';
}

/**
 * Tries watchPosition once; resolves with first success or null after timeout.
 * Sometimes works when getCurrentPosition fails (e.g. on desktop with WiFi location).
 */
function tryWatchPosition(): Promise<GeoPosition | null> {
  return new Promise((resolve) => {
    const timeoutMs = 20000;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        navigator.geolocation.clearWatch(id);
        resolve(toPosition(pos));
      },
      () => {
        navigator.geolocation.clearWatch(id);
        resolve(null);
      },
      GEO_OPTIONS,
    );
    setTimeout(() => {
      navigator.geolocation.clearWatch(id);
      resolve(null);
    }, timeoutMs);
  });
}

/**
 * Hook to get current device position for GED upload.
 * Tries getCurrentPosition first; if it fails, falls back to watchPosition (often works when the first fails).
 */
export function useGeolocation(): UseGeolocationResult {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getPosition = useCallback((): Promise<GeoPosition | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return Promise.resolve(null);
    }
    setLoading(true);
    setError(null);
    return new Promise((resolve) => {
      const onSuccess = (pos: GeolocationPosition) => {
        const p = toPosition(pos);
        setPosition(p);
        setLoading(false);
        setError(null);
        resolve(p);
      };
      const onFailure = (err: GeolocationPositionError) => {
        setError(getErrorMessage(err));
        setPosition(null);
        tryWatchPosition().then((p) => {
          setLoading(false);
          if (p) {
            setPosition(p);
            setError(null);
            resolve(p);
          } else {
            resolve(null);
          }
        });
      };
      navigator.geolocation.getCurrentPosition(onSuccess, onFailure, GEO_OPTIONS);
    });
  }, []);

  return { position, error, loading, getPosition };
}
