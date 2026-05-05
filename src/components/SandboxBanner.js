import React, { useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Always-visible banner shown when this build of the portal is a sandbox,
 * OR when the backend it talks to reports SANDBOX_MODE=true. We OR both signals
 * so a misconfigured deploy (e.g. sandbox portal accidentally pointed at prod
 * backend, or vice-versa) still surfaces a warning.
 *
 * Safety contract: if either side says "sandbox", the banner appears.
 */
const SandboxBanner = () => {
  const buildTimeSandbox = process.env.REACT_APP_SANDBOX_MODE === 'true';
  const [backendSandbox, setBackendSandbox] = useState(false);
  const [backendLabel, setBackendLabel] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/env`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setBackendSandbox(Boolean(data.sandbox));
          setBackendLabel(data.label || null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const sandbox = buildTimeSandbox || backendSandbox;
  if (!sandbox) return null;

  const label = backendLabel || 'SANDBOX';

  // Mismatch warning: build says sandbox but backend says prod (or reverse).
  // This is almost always a misconfiguration that someone needs to fix.
  const mismatch =
    (buildTimeSandbox && backendLabel && !backendSandbox) ||
    (!buildTimeSandbox && backendSandbox);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        background: mismatch ? '#dc2626' : '#f59e0b',
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 0.5,
        padding: '6px 12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      }}
      role="status"
      aria-label={`${label} environment banner`}
    >
      {mismatch
        ? `⚠ ENVIRONMENT MISMATCH — frontend ${
            buildTimeSandbox ? 'IS sandbox' : 'is prod'
          } but backend ${backendSandbox ? 'IS sandbox' : 'is prod'}. Check REACT_APP_API_URL and SANDBOX_MODE.`
        : `${label} ENVIRONMENT — actions here do not affect production. Outbound SMS and email are disabled.`}
    </div>
  );
};

export default SandboxBanner;
