import { useEffect, useRef } from 'react';
import api from '../services/api';
import { getDeviceId } from '../utils/fingerprint';

// Mount once at the app root. Sets X-Device-ID on all outbound Axios requests
// so the backend's device middleware can identify and fingerprint this install.
export function useDeviceFingerprint(): void {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    getDeviceId()
      .then((deviceId) => {
        api.defaults.headers.common['X-Device-ID'] = deviceId;
      })
      .catch(() => {});
  }, []);
}
