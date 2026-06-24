import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { PlayIcon, StopIcon } from '@heroicons/react/24/solid';

const THUMB_SIZE = 48;
const TRACK_PADDING = 4;

const SlideToAction = ({
  label,
  onComplete,
  disabled = false,
  hint,
  variant = 'success',
  className = '',
}) => {
  const trackRef = useRef(null);
  const x = useMotionValue(0);
  const [isComplete, setIsComplete] = useState(false);
  const [maxDrag, setMaxDrag] = useState(0);

  useEffect(() => {
    const updateMaxDrag = () => {
      if (!trackRef.current) return;
      setMaxDrag(Math.max(0, trackRef.current.offsetWidth - THUMB_SIZE - TRACK_PADDING * 2));
    };

    updateMaxDrag();
    window.addEventListener('resize', updateMaxDrag);
    return () => window.removeEventListener('resize', updateMaxDrag);
  }, []);

  const labelOpacity = useTransform(x, (value) => {
    if (!maxDrag) return 1;
    return Math.max(0, 1 - value / (maxDrag * 0.6));
  });

  const trackClass =
    variant === 'neutral'
      ? disabled
        ? 'bg-gray-300'
        : 'bg-gray-700'
      : disabled
        ? 'bg-gray-300'
        : 'bg-green-600';

  const iconClass = variant === 'neutral' ? 'text-gray-700' : 'text-green-600';

  const resetSlider = () => {
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    setIsComplete(false);
  };

  const handleDragEnd = () => {
    if (disabled || isComplete) return;
    if (x.get() >= maxDrag * 0.9) {
      animate(x, maxDrag, { type: 'spring', stiffness: 400, damping: 30 });
      setIsComplete(true);
      Promise.resolve(onComplete?.()).finally(() => {
        setTimeout(resetSlider, 500);
      });
    } else {
      resetSlider();
    }
  };

  const Icon = variant === 'neutral' ? StopIcon : PlayIcon;

  return (
    <div className={className}>
      <div
        ref={trackRef}
        className={`relative h-14 rounded-full overflow-hidden select-none touch-none ${trackClass}`}
      >
        <motion.span
          className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white pointer-events-none"
          style={{ opacity: labelOpacity }}
        >
          {label}
        </motion.span>

        <motion.button
          type="button"
          aria-label={label}
          disabled={disabled || isComplete}
          drag={disabled || isComplete ? false : 'x'}
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{
            x,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            top: TRACK_PADDING,
            left: TRACK_PADDING,
          }}
          className={`absolute z-10 flex items-center justify-center rounded-full bg-white shadow-md ${
            disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          }`}
        >
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </motion.button>

        {isComplete && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-sm font-medium">
            Done
          </span>
        )}
      </div>
      {hint ? (
        <p className="mt-1 text-center text-xs text-gray-500">
          {disabled ? 'Action unavailable' : hint}
        </p>
      ) : null}
    </div>
  );
};

export default SlideToAction;
