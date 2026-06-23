import { useCallback, useEffect, useRef, useState } from 'react';
import { transportationProviderAPI } from '../services/api';

const PING_INTERVAL_MS = 30 * 1000;

export function useTripLocationTracking(jobId, { enabled = true } = {}) {
  const [trackingActive, setTrackingActive] = useState(false);
  const [lastLocationAt, setLastLocationAt] = useState(null);
  const [trackingError, setTrackingError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const watchIdRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const lastSentRef = useRef({ lat: null, lng: null, at: 0 });

  const clearWatchers = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const sendPing = useCallback(
    async (position) => {
      if (!jobId || !position?.coords) return;
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      const now = Date.now();
      const last = lastSentRef.current;
      const movedEnough =
        last.lat == null ||
        Math.abs(last.lat - latitude) > 0.0001 ||
        Math.abs(last.lng - longitude) > 0.0001;
      if (!movedEnough && now - last.at < PING_INTERVAL_MS) {
        return;
      }

      try {
        await transportationProviderAPI.sendTrackingPing(jobId, {
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
        });
        lastSentRef.current = { lat: latitude, lng: longitude, at: now };
        setLastLocationAt(new Date().toISOString());
        setTrackingError(null);
      } catch (err) {
        setTrackingError(err.response?.data?.message || err.message || 'Failed to send location');
      }
    },
    [jobId]
  );

  const startWatchers = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingError('Location is not supported in this browser');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        sendPing(position);
      },
      (err) => {
        setTrackingError(err.message || 'Unable to access location');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    pingIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => sendPing(position),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    }, PING_INTERVAL_MS);
  }, [sendPing]);

  const refreshStatus = useCallback(async () => {
    if (!jobId || !enabled) return;
    try {
      const response = await transportationProviderAPI.getTrackingStatus(jobId);
      const data = response.data;
      setTrackingActive(data.active === true);
      setLastLocationAt(data.lastLocation?.recordedAt || null);
    } catch {
      // Trip may not support tracking yet
    }
  }, [jobId, enabled]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const handleBeforeUnload = () => clearWatchers();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearWatchers();
    };
  }, [clearWatchers]);

  const startTracking = useCallback(async () => {
    if (!jobId) return;
    setStarting(true);
    setTrackingError(null);
    try {
      await transportationProviderAPI.startTracking(jobId);
      setTrackingActive(true);
      startWatchers();
      navigator.geolocation.getCurrentPosition(
        (position) => sendPing(position),
        () => {},
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } catch (err) {
      setTrackingError(err.response?.data?.message || err.message || 'Failed to start tracking');
    } finally {
      setStarting(false);
    }
  }, [jobId, sendPing, startWatchers]);

  const stopTracking = useCallback(async () => {
    if (!jobId) return;
    setStopping(true);
    clearWatchers();
    try {
      await transportationProviderAPI.stopTracking(jobId);
      setTrackingActive(false);
    } catch (err) {
      setTrackingError(err.response?.data?.message || err.message || 'Failed to stop tracking');
    } finally {
      setStopping(false);
    }
  }, [jobId, clearWatchers]);

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
