import React from 'react';
import { motion } from 'framer-motion';

const ProgressBar = ({ currentStep, totalSteps, steps, onStepClick, visitedSteps = new Set([1]) }) => {
  const totalStepsCount = totalSteps || steps?.length || 1;
  const progress = (currentStep / totalStepsCount) * 100;

  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isFuture = stepNumber > currentStep;
          const isVisited = visitedSteps.has(stepNumber);
          const isUnlocked = isFuture && isVisited; // Future step that user has visited before
          const isLocked = isFuture && !isVisited; // Future step that user hasn't visited
          const isClickable = isCompleted || isUnlocked;
          
          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {/* Step circle */}
                <motion.div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium
                    ${isActive 
                      ? 'border-blue-600 bg-blue-600 text-white cursor-pointer' 
                      : isCompleted 
                        ? 'border-green-600 bg-green-600 text-white cursor-pointer'
                        : isUnlocked
                          ? 'border-blue-400 bg-white text-blue-600 cursor-pointer'
                          : 'border-gray-300 bg-white text-gray-400 cursor-not-allowed'
                    }
                  `}
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isActive 
                      ? '#2563EB' 
                      : isCompleted 
                        ? '#16A34A' 
                        : '#FFFFFF'
                  }}
                  transition={{ duration: 0.2 }}
                  onClick={() => isClickable && onStepClick && onStepClick(stepNumber)}
                  whileHover={isClickable ? { scale: 1.05 } : {}}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : isLocked ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </motion.div>
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 ml-2">
                    <div className="h-full bg-gray-200 relative overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-600"
                        initial={{ width: '0%' }}
                        animate={{ 
                          width: stepNumber < currentStep ? '100%' : '0%'
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Step label */}
              <div className="mt-2 text-center">
                <p className={`text-xs font-medium ${
                  isActive 
                    ? 'text-blue-600' 
                    : isCompleted 
                      ? 'text-green-600'
                      : isUnlocked
                        ? 'text-blue-500'
                        : 'text-gray-400'
                }`}>
                  {step.title || step.name}
                </p>
                <p className={`text-xs mt-1 hidden sm:block ${
                  isLocked ? 'text-gray-300' : 'text-gray-400'
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className="bg-blue-600 h-2 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>
      
      {/* Progress text */}
      <div className="flex justify-between text-sm text-gray-600 mt-2">
        <span>Step {currentStep} of {totalStepsCount}</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
    </div>
  );
};

export default ProgressBar;