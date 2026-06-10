import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import {
  FACILITY_DURATION_FOLLOW_UP_MESSAGE,
  formatDurationMinutes,
  getScheduledDurationMinutes,
} from '../utils/completionReportDuration';

const FacilityDurationFollowUpNotice = ({
  actualDurationMinutes,
  jobData,
  className = '',
}) => {
  const scheduledMinutes = getScheduledDurationMinutes(jobData);

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <ClockIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-900">
            Actual duration exceeds scheduled duration
          </p>
          {actualDurationMinutes != null && scheduledMinutes > 0 && (
            <p className="text-sm text-amber-800 mt-1">
              Reported: {formatDurationMinutes(actualDurationMinutes)} · Scheduled: {formatDurationMinutes(scheduledMinutes)}
            </p>
          )}
          <p className="text-sm text-amber-800 mt-2">
            {FACILITY_DURATION_FOLLOW_UP_MESSAGE}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FacilityDurationFollowUpNotice;
