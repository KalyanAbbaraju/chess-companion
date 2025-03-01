'use client';

import React, { useState } from 'react';

interface ScannedImageDisplayProps {
  imageData: string;
}

const ScannedImageDisplay: React.FC<ScannedImageDisplayProps> = ({ imageData }) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  return (
    <div className="space-y-2">
      <div 
        className={`relative cursor-pointer ${expanded ? 'max-h-[70vh]' : 'max-h-[200px]'} overflow-hidden transition-all duration-300`}
        onClick={() => setExpanded(!expanded)}
      >
        <img 
          src={imageData} 
          alt="Scanned scoresheet" 
          className="w-full object-contain rounded-md border border-gray-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity duration-300 flex items-center justify-center">
          <span className="text-transparent hover:text-white text-sm font-medium">
            {expanded ? 'Click to collapse' : 'Click to expand'}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-500 text-center">
        {expanded ? 'Click image to collapse' : 'Click image to expand'}
      </p>
    </div>
  );
};

export default ScannedImageDisplay; 