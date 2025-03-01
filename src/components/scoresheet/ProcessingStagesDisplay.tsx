'use client';

import React from 'react';
import Image from 'next/image';

type ProcessingStage = {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
};

interface ProcessingStagesDisplayProps {
  stages: ProcessingStage[];
  currentStage: string;
  progress: number; // Overall progress 0-100
  onCancel: () => void;
}

const ProcessingStagesDisplay: React.FC<ProcessingStagesDisplayProps> = ({
  stages,
  currentStage,
  progress,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col justify-center items-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold text-primary">Processing Your Scoresheet</h1>
        <button 
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center max-w-3xl w-full px-6 py-10">
        {/* Current Stage Highlight */}
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold mb-2">
            {stages.find(s => s.id === currentStage)?.title || 'Processing...'}
          </h2>
          <p className="text-xl text-gray-600">
            {stages.find(s => s.id === currentStage)?.description || 'Please wait while we process your scoresheet.'}
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-3 bg-gray-200 rounded-full mb-10 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Stages Timeline */}
        <div className="w-full">
          {stages.map((stage, index) => {
            // Determine if this stage is active, completed, or pending
            const isActive = stage.id === currentStage;
            const isCompleted = stage.status === 'completed';
            const isFailed = stage.status === 'failed';
            
            return (
              <div 
                key={stage.id} 
                className={`flex items-center mb-6 ${isActive ? 'opacity-100' : isCompleted ? 'opacity-90' : 'opacity-50'}`}
              >
                {/* Stage Icon */}
                <div 
                  className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full mr-4
                    ${isActive ? 'bg-primary text-white animate-pulse' : 
                      isCompleted ? 'bg-green-100 text-green-600' : 
                      isFailed ? 'bg-red-100 text-red-600' : 
                      'bg-gray-100 text-gray-400'}`}
                >
                  {isCompleted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isFailed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <span className="text-xl">{index + 1}</span>
                  )}
                </div>
                
                {/* Stage Info */}
                <div className="flex-grow">
                  <h3 className={`font-semibold ${isActive ? 'text-primary text-lg' : 'text-gray-700'}`}>
                    {stage.title}
                  </h3>
                  <p className={`text-sm ${isActive ? 'text-gray-700' : 'text-gray-500'}`}>
                    {stage.description}
                  </p>
                </div>
                
                {/* Stage Status */}
                <div className="flex-shrink-0 ml-4">
                  {isActive && (
                    <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer - Tips */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 text-center text-sm text-gray-600 border-t">
        <p>This may take a few moments. Please don't close the browser while processing.</p>
      </div>
    </div>
  );
};

export default ProcessingStagesDisplay;