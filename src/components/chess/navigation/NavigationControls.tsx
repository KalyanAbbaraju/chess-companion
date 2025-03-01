import React from 'react';

interface NavigationControlsProps {
  currentMoveIndex: number;
  historyLength: number;
  goToStart: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToEnd: () => void;
  moveDescription: string;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentMoveIndex,
  historyLength,
  goToStart,
  goToPrevious,
  goToNext,
  goToEnd,
  moveDescription
}) => {
  return (
    <div className="flex justify-center space-x-3 mt-4">
      <button 
        onClick={goToStart}
        className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        title="Go to start"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </button>
      <button 
        onClick={goToPrevious}
        className={`p-2 rounded-md ${currentMoveIndex < 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors`}
        title="Previous move"
        disabled={currentMoveIndex < 0}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-medium text-gray-800 min-w-[120px] text-center">
        {moveDescription}
      </div>
      <button 
        onClick={goToNext}
        className={`p-2 rounded-md ${currentMoveIndex >= historyLength - 1 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors`}
        title="Next move"
        disabled={currentMoveIndex >= historyLength - 1}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <button 
        onClick={goToEnd}
        className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        title="Go to end"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default NavigationControls; 