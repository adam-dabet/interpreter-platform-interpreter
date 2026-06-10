export const FACILITY_DURATION_FOLLOW_UP_MESSAGE =
  'We will be following up with the facility to confirm the duration of this appointment.';

export function getScheduledDurationMinutes(jobData) {
  if (!jobData) return 0;

  const estimated = Number(jobData.estimated_duration_minutes) || 0;
  if (estimated > 0) return estimated;

  const reservedHours = Number(jobData.reserved_hours) || 0;
  const reservedMinutes = Number(jobData.reserved_minutes) || 0;
  return (reservedHours * 60) + reservedMinutes;
}

export function calculateActualDurationMinutes(startHour, startMinute, startPeriod, endHour, endMinute, endPeriod) {
  if (!startHour || !startMinute || !startPeriod || !endHour || !endMinute || !endPeriod) {
    return null;
  }

  const convertTo24Hour = (hour, period) => {
    const h = parseInt(hour.value, 10);
    if (period.value === 'AM') {
      return h === 12 ? 0 : h;
    }
    return h === 12 ? 12 : h + 12;
  };

  const startHour24 = convertTo24Hour(startHour, startPeriod);
  const endHour24 = convertTo24Hour(endHour, endPeriod);
  const startMinutes = startHour24 * 60 + parseInt(startMinute.value, 10);
  const endMinutes = endHour24 * 60 + parseInt(endMinute.value, 10);

  if (endMinutes <= startMinutes) return null;
  return endMinutes - startMinutes;
}

export function durationExceedsScheduled(actualDurationMinutes, jobData) {
  const scheduledMinutes = getScheduledDurationMinutes(jobData);
  if (!scheduledMinutes || actualDurationMinutes == null) return false;
  return actualDurationMinutes > scheduledMinutes;
}

export function formatDurationMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}
