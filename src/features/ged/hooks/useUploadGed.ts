import { useCallback, useState } from 'react';
import { getStoredAuth } from '../../../utils/authStorage';
import { buildCreateGedFormData, createGed } from '../services/ged.service';
import type { GedItem } from '../types/ged.types';
import { IDSOURCE_EMPTY_GUID } from '../constants';
import { useGeolocation } from './useGeolocation';

export interface UploadGedInput {
  idsource: string;
  chantier: string;
  title: string;
  description: string;
  imageFile: File;
  voiceFile?: File | null;
}

export interface UseUploadGedResult {
  uploadGed: (input: UploadGedInput) => Promise<GedItem | null>;
  uploading: boolean;
  error: string | null;
  geoError: string | null;
  clearError: () => void;
  getPosition: () => Promise<{ latitude: string; longitude: string; altitude: string; accuracy: string; altitudeAccuracy: string } | null>;
  geoLoading: boolean;
}

/**
 * Hook to upload a new qualiphoto GED.
 * Uses connected user for author/idauthor/company_id, and current device position for lat/long/altitude/accuracy.
 * Call getPosition() when opening the form (or on submit) then uploadGed() with form values.
 */
export function useUploadGed(): UseUploadGedResult {
  const { getPosition: getGeoPosition, error: geoError, loading: geoLoading } = useGeolocation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const uploadGed = useCallback(
    async (input: UploadGedInput): Promise<GedItem | null> => {
      const { user } = getStoredAuth();
      if (!user) {
        setError('Not connected');
        return null;
      }
      setError(null);
      setUploading(true);
      try {
        const position = await getGeoPosition();
        const idsource = input.idsource || IDSOURCE_EMPTY_GUID;
        const formData = buildCreateGedFormData({
          author: `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() || user.identifier,
          idauthor: user.id,
          company_id: user.company_id,
          position: position ?? null,
          idsource,
          chantier: input.chantier,
          title: input.title,
          description: input.description,
          imageFile: input.imageFile,
          voiceFile: input.voiceFile ?? null,
        });
        const created = await createGed(idsource, formData);
        return created;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Upload failed';
        setError(message);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [getGeoPosition],
  );

  return {
    uploadGed,
    uploading,
    error,
    geoError,
    clearError,
    getPosition: getGeoPosition,
    geoLoading,
  };
}
