// ── Media upload hook ─────────────────────────────────────────────────────────
//
// Full presigned upload flow:
//   1. POST /api/media/upload-url  → get presigned S3 PUT URL
//   2. axios.put(presignedUrl)     → upload directly to S3 (zero backend bandwidth)
//   3. POST /complete              → notify backend, trigger processing queue
//
// Usage:
//   const { upload, uploading, progress } = useMediaUpload();
//   const result = await upload({ uri, mimeType: 'image/jpeg', fileSize, mediaType: 'PROFILE_PHOTO' });
//   // result.assetId is immediately usable in API calls (status: PROCESSING)
//   // The asset becomes READY asynchronously — poll getAsset() or listen via socket

import { useState, useCallback } from 'react';
import axios from 'axios';
import api from '../services/api';

export type MediaType =
  | 'PROFILE_PHOTO'
  | 'PRIVATE_PHOTO'
  | 'CHAT_ATTACHMENT'
  | 'VERIFICATION_SELFIE';

export interface UploadOptions {
  uri:       string;    // local file URI from expo-image-picker
  mimeType:  string;    // e.g. 'image/jpeg'
  fileSize:  number;    // bytes — required for server-side size validation
  mediaType: MediaType;
}

export interface UploadResult {
  assetId: string;
  status:  'PROCESSING';
}

interface UseMediaUpload {
  upload:    (opts: UploadOptions) => Promise<UploadResult>;
  uploading: boolean;
  progress:  number;   // 0–100
  error:     string | null;
  reset:     () => void;
}

// ── Client-side validation constants ─────────────────────────────────────────
// These mirror the server-side limits defined in env.ts / media validation service.
// Catching violations here avoids a round-trip to the server.
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'audio/aac',
  'audio/mpeg',
  'audio/mp4',
]);

export function useMediaUpload(): UseMediaUpload {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState<string | null>(null);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(async (opts: UploadOptions): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // ── Client-side validation (P1-8) ────────────────────────────────────────
      // Catch obvious violations before spending a round-trip to the server.
      if (!ALLOWED_MIME_TYPES.has(opts.mimeType)) {
        throw new Error(
          `File type "${opts.mimeType}" is not supported. ` +
          'Please upload a JPEG, PNG, WebP, or MP4 file.'
        );
      }
      if (opts.fileSize > MAX_FILE_SIZE_BYTES) {
        const mb = (opts.fileSize / 1024 / 1024).toFixed(1);
        throw new Error(
          `File is too large (${mb} MB). Maximum size is 50 MB.`
        );
      }
      // Step 1 — get presigned URL from our backend (fast, ~50ms)
      const sessionRes = await api.post<{
        success: boolean;
        data: {
          sessionId: string;
          assetId:   string;
          uploadUrl: string;
          expiresAt: string;
        };
      }>('/media/upload-url', {
        mediaType: opts.mediaType,
        mimeType:  opts.mimeType,
        fileSize:  opts.fileSize,
      });

      const { sessionId, assetId, uploadUrl } = sessionRes.data.data;
      setProgress(10);

      // Step 2 — read the file and PUT directly to S3
      // Using fetch to read the local URI into a Blob, then axios for S3 upload
      // (axios gives us upload progress events; fetch does not in React Native)
      const fileBlob = await uriToBlob(opts.uri);
      setProgress(15);

      await axios.put(uploadUrl, fileBlob, {
        headers: { 'Content-Type': opts.mimeType },
        // No Authorization header — presigned URL is self-authenticated
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(15 + Math.round((evt.loaded / evt.total) * 75));
          }
        },
        // Use a fresh axios instance to avoid injecting Bearer token into S3 URL
        // (S3 rejects requests with both a presigned auth and an Authorization header)
        transformRequest: [(data) => data],
      });

      setProgress(90);

      // Step 3 — notify backend that upload completed; enqueues processing job
      await api.post(`/media/upload-url/${sessionId}/complete`);
      setProgress(100);

      return { assetId, status: 'PROCESSING' };
    } catch (err: any) {
      const message: string =
        err?.response?.data?.message ?? err?.message ?? 'Upload failed';
      setError(message);
      throw new Error(message);
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, progress, error, reset };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert a local file URI (from expo-image-picker) to a Blob for upload.
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}
