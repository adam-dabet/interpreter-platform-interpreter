/**
 * Controlled "miles to job" input: allow empty while typing, parse for API/logic.
 */
export function milesInputToNumber(raw) {
  if (raw === '' || raw === '.' || raw == null) return 0;
  const n = parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Allow partial decimals while typing (e.g. "", "12", "12.") */
export function isPartialMilesInput(value) {
  return value === '' || /^\d*\.?\d*$/.test(value);
}
