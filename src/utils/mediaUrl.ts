// ── Media URL utilities ───────────────────────────────────────────────────────
//
// Helpers for fetching CDN URLs and building responsive image props for
// React Native's <Image> component.
//
// Progressive loading pattern:
//   1. Render <Image source={{uri: blurhash}} /> immediately (placeholder)
//   2. Fetch the real URL from GET /api/media/:assetId/url?variant=MEDIUM
//   3. Fade the real image in over the blurhash placeholder
//
// Install react-native-blurhash for blurhash rendering:
//   npx expo install react-native-blurhash
//
// Responsive variant selection:
//   Pick the smallest variant that covers the display area (PixelRatio-aware).

import { PixelRatio, Dimensions } from 'react-native';
import api from '../services/api';

export type VariantType = 'THUMB' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ORIGINAL';
export type ImageFormat  = 'WEBP' | 'AVIF' | 'JPEG';

export interface MediaUrlResponse {
  url:         string;
  variantType: string;
  format:      string;
  width:       number;
  height:      number;
  blurhash:    string | null;
  expiresAt:   string | null;
}

export interface AssetMeta {
  id:              string;
  mediaType:       string;
  status:          string;
  moderationState: string;
  width:           number | null;
  height:          number | null;
  fileSizeBytes:   number;
  blurhash:        string | null;
  variants:        Array<{ variantType: string; format: string; width: number; height: number; fileSizeBytes: number }>;
}

// Fetch a CDN URL for a specific variant from our API.
// For private media, the returned URL is a short-lived CloudFront signed URL.
export async function fetchMediaUrl(
  assetId:     string,
  variantType: VariantType = 'MEDIUM',
  format:      ImageFormat  = 'WEBP',
): Promise<MediaUrlResponse> {
  const res = await api.get<{ success: boolean; data: MediaUrlResponse }>(
    `/media/${assetId}/url`,
    { params: { variant: variantType, format } },
  );
  return res.data.data;
}

// Fetch asset metadata (variants list, blurhash, dimensions) without a URL.
export async function fetchAssetMeta(assetId: string): Promise<AssetMeta> {
  const res = await api.get<{ success: boolean; data: AssetMeta }>(`/media/${assetId}`);
  return res.data.data;
}

// ── Responsive variant selection ──────────────────────────────────────────────
//
// Given a display size (logical pixels), returns the smallest variant
// that will still look sharp at the device's pixel ratio.
// This minimises bandwidth on lower-DPI devices.

const VARIANT_MAX_DIM: Record<VariantType, number> = {
  THUMB:    160,
  SMALL:    320,
  MEDIUM:   640,
  LARGE:    1200,
  ORIGINAL: Infinity,
};

export function selectVariant(displayWidthPx: number): VariantType {
  const physicalPx = displayWidthPx * PixelRatio.get();
  const candidates: VariantType[] = ['THUMB', 'SMALL', 'MEDIUM', 'LARGE', 'ORIGINAL'];
  for (const v of candidates) {
    if (VARIANT_MAX_DIM[v] >= physicalPx) return v;
  }
  return 'LARGE';
}

// Convenience: select the right variant for the current screen width.
export function selectVariantForScreen(fractionOfScreen = 1): VariantType {
  const screenWidth = Dimensions.get('window').width;
  return selectVariant(screenWidth * fractionOfScreen);
}
