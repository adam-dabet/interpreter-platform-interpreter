import { useCallback, useEffect, useRef, useState } from 'react';
import { transportationProviderAPI } from '../services/api';

const PING_INTERVAL_MS = 30 * 1000;
const ACTIVE_TRIP_KEY = 'activeTrackingTripId';

let globalJobId = null;
let watchIdRef = null;
let pingIntervalRef = null;
let lastSentRef = { lat: null, lng: null, at: 0 };

function clearGlobalWatchers() {
  if (watchIdRef != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchIdRef);
    watchIdRef = null;
  }
  if (pingIntervalRef) {
    clearInterval(pingIntervalRef);
    pingIntervalRef = null;
  }
}

async function sendPing(jobId, position, { force = false } = {}) {
  if (!jobId || !position?.coords) return;
  const { latitude, longitude, accuracy, heading, speed } = position.coords;
  const now = Date.now();
  const last = lastSentRef;
  const movedEnough =
    last.lat == null ||
    Math.abs(last.lat - latitude) > 0.0001 ||
    Math.abs(last.lng - longitude) > 0.0001;
  if (!force && !movedEnough && now - last.at < PING_INTERVAL_MS) {
    return;
  }

  await transportationProviderAPI.sendTrackingPing(jobId, {
    latitude,
    longitude,
    accuracy,
    heading,
    speed,
  });
  lastSentRef = { lat: latitude, lng: longitude, at: now };
}

function startGlobalWatchers(jobId, onError) {
  if (!navigator.geolocation) {
    onError?.('Location is not supported in this browser');
    return;
  }

  if (globalJobId === jobId && watchIdRef != null) {
    return;
  }

  clearGlobalWatchers();
  globalJobId = jobId;
  lastSentRef = { lat: null, lng: null, at: 0 };

  watchIdRef = navigator.geolocation.watchPosition(
    (position) => {
      sendPing(jobId, position).catch((err) => {
        onError?.(err.response?.data?.message || err.message || 'Failed to send location');
      });
    },
    (err) => {
      onError?.(err.message || 'Unable to access location');
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
  );

  pingIntervalRef = setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendPing(jobId, position, { force: true }).catch((err) => {
          onError?.(err.response?.data?.message || err.message || 'Failed to send location');
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, PING_INTERVAL_MS);
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
        const storedTripId = localStorage.getItem(ACTIVE_TRIP_KEY);
        if (!storedTripId) {
          localStorage.setItem(ACTIVE_TRIP_KEY, jobId);
        }
        startGlobalWatchers(jobId, (message) => onErrorRef.current(message));
        navigator.geolocation?.getCurrentPosition(
          (position) => sendPing(jobId, position, { force: true }).catch(() => {}),
          () => {},
          { enableHighAccuracy: true, timeout: 15000 }
        );
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
      navigator.geolocation.getCurrentPosition(
        (position) => sendPing(jobId, position, { force: true }).catch(() => {}),
        () => {},
        { enableHighAccuracy: true, timeout: 15000 }
      );
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
