import { useCallback, useEffect, useRef, useState } from 'react';
import { transportationProviderAPI } from '../services/api';

const PING_INTERVAL_MS = 30 * 1000;
const MIN_API_PING_MS = 25 * 1000;
const ACTIVE_TRIP_KEY = 'activeTrackingTripId';

let globalJobId = null;
let pingIntervalRef = null;
let lastApiPingAt = 0;

function isRateLimitError(error) {
  const message = error?.message || '';
  return message.toLowerCase().includes('too many requests') || error?.response?.status === 429;
}

function clearGlobalWatchers() {
  if (pingIntervalRef) {
    clearInterval(pingIntervalRef);
    pingIntervalRef = null;
  }
}

async function sendPing(jobId, position) {
  if (!jobId || !position?.coords) return false;
  const now = Date.now();
  if (now - lastApiPingAt < MIN_API_PING_MS) return false;

  const { latitude, longitude, accuracy, heading, speed } = position.coords;
  try {
    await transportationProviderAPI.sendTrackingPing(jobId, {
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
    });
    lastApiPingAt = now;
    return true;
  } catch (err) {
    if (isRateLimitError(err)) {
      return false;
    }
    throw err;
  }
}

function startGlobalWatchers(jobId, onError) {
  if (!navigator.geolocation) {
    onError?.('Location is not supported in this browser');
    return;
  }

  if (globalJobId === jobId && pingIntervalRef != null) {
    return;
  }

  clearGlobalWatchers();
  globalJobId = jobId;
  lastApiPingAt = 0;

  const tick = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendPing(jobId, position).catch((err) => {
          if (!isRateLimitError(err)) {
            onError?.(err.response?.data?.message || err.message || 'Failed to send location');
          }
        });
      },
      (err) => {
        onError?.(err.message || 'Unable to access location');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  tick();
  pingIntervalRef = setInterval(tick, PING_INTERVAL_MS);
}

export function useTripLocationTracking(jobId, { enabled = true } = {}) {
  const [trackingActive, setTrackingActive] = useState(false);
  const [lastLocationAt, setLastLocationAt] = useState(null);
  const [trackingError, setTrackingError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const onErrorRef = useRef(setTrackingError);

  useEffect(() => {
    onErrorRef.current = setTrackingError;
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!jobId || !enabled) return;
    try {
      const response = await transportationProviderAPI.getTrackingStatus(jobId);
      const data = response.data;
      const active = data.active === true;
      setTrackingActive(active);
      setLastLocationAt(data.lastLocation?.recordedAt || null);
      if (active) {
        localStorage.setItem(ACTIVE_TRIP_KEY, jobId);
        startGlobalWatchers(jobId, (message) => onErrorRef.current(message));
        setTrackingError(null);
      } else if (globalJobId === jobId) {
        clearGlobalWatchers();
        globalJobId = null;
        localStorage.removeItem(ACTIVE_TRIP_KEY);
      }
    } catch {
      // Trip may not support tracking yet
    }
  }, [jobId, enabled]);

  useEffect(() => {
    refreshStatus();
    const pollId = setInterval(() => refreshStatus(), 15000);
    return () => clearInterval(pollId);
  }, [refreshStatus]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && globalJobId === jobId) {
        startGlobalWatchers(jobId, (message) => onErrorRef.current(message));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [jobId]);

  const startTracking = useCallback(async () => {
    if (!jobId) return;
    setStarting(true);
    setTrackingError(null);
    try {
      await transportationProviderAPI.startTracking(jobId);
      localStorage.setItem(ACTIVE_TRIP_KEY, jobId);
      setTrackingActive(true);
      startGlobalWatchers(jobId, (message) => onErrorRef.current(message));
    } catch (err) {
      setTrackingError(err.response?.data?.message || err.message || 'Failed to start tracking');
    } finally {
      setStarting(false);
    }
  }, [jobId]);

  const stopTracking = useCallback(async () => {
    if (!jobId) return;
    setStopping(true);
    try {
      await transportationProviderAPI.stopTracking(jobId);
      if (globalJobId === jobId) {
        clearGlobalWatchers();
        globalJobId = null;
      }
      localStorage.removeItem(ACTIVE_TRIP_KEY);
      setTrackingActive(false);
    } catch (err) {
      setTrackingError(err.response?.data?.message || err.message || 'Failed to stop tracking');
    } finally {
      setStopping(false);
    }
  }, [jobId]);

  return {
    trackingActive,
    lastLocationAt,
    trackingError,
    starting,
    stopping,
    startTracking,
    stopTracking,
    refreshStatus,
  };
}
