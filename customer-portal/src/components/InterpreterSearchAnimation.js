import React from 'react';

const InterpreterSearchAnimation = ({ isVisible = true, searchDuration = 0, onCancel }) => {
  if (!isVisible) return null;

  // Calculate search duration in seconds
  const searchSeconds = Math.floor(searchDuration / 1000);
  const searchMinutes = Math.floor(searchSeconds / 60);
  const remainingSeconds = searchSeconds % 60;

  // Dynamic messages based on search duration
  const getSearchMessage = () => {
    if (searchSeconds < 30) return "Searching our network of certified interpreters...";
    if (searchSeconds < 60) return "Expanding search to include more interpreters...";
    if (searchSeconds < 120) return "Checking interpreter availability and schedules...";
    return "Searching specialized interpreters for your requirements...";
  };

  const getTimeMessage = () => {
    if (searchSeconds < 30) return "This usually takes 30-60 seconds...";
    if (searchSeconds < 60) return "Still searching for the best match...";
    if (searchSeconds < 120) return "Taking a bit longer to find the perfect interpreter...";
    return "Search is taking longer than usual. We're working hard to find you the right interpreter.";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            🔍 Finding Your Interpreter
          </h2>
          <p className="text-gray-600">
            {getSearchMessage()}
          </p>
        </div>

        {/* Main Animation Container */}
        <div className="relative mb-6">
          {/* Central Search Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              {/* Pulsing Ring */}
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-300 animate-pulse"></div>
              
              {/* Search Icon */}
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center relative z-10">
                <svg className="w-8 h-8 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Floating Interpreter Icons */}
          <div className="relative h-32">
            {/* Interpreter 1 */}
            <div className="absolute top-4 left-8 animate-float-1">
              <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">👤</span>
              </div>
            </div>
            
            {/* Interpreter 2 */}
            <div className="absolute top-8 right-12 animate-float-2">
              <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">👤</span>
              </div>
            </div>
            
            {/* Interpreter 3 */}
            <div className="absolute bottom-4 left-12 animate-float-3">
              <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">👤</span>
              </div>
            </div>
            
            {/* Interpreter 4 */}
            <div className="absolute bottom-8 right-8 animate-float-4">
              <div className="w-8 h-8 bg-pink-400 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">👤</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">Appointment details verified</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">Searching available interpreters</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-spin">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">Matching skills and availability</span>
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center">
          <p className="text-sm text-gray-500 animate-pulse">
            {getTimeMessage()}
          </p>
          {searchSeconds > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Search time: {searchMinutes > 0 ? `${searchMinutes}m ` : ''}{remainingSeconds}s
            </p>
          )}
          
          {/* Cancel Search Button */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel Search & Check Later
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes float-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        
        @keyframes float-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-3deg); }
        }
        
        @keyframes float-3 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(4deg); }
        }
        
        @keyframes float-4 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(-2deg); }
        }
        
        .animate-float-1 {
          animation: float-1 3s ease-in-out infinite;
        }
        
        .animate-float-2 {
          animation: float-2 3.5s ease-in-out infinite;
        }
        
        .animate-float-3 {
          animation: float-3 2.8s ease-in-out infinite;
        }
        
        .animate-float-4 {
          animation: float-4 3.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default InterpreterSearchAnimation;
