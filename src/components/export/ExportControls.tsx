'use client';

import React from 'react';
import { ChessMove } from '@/lib/types';

interface ExportControlsProps {
  moves: ChessMove[];
  playerInfo: {
    whitePlayer: string;
    blackPlayer: string;
    event: string;
    date: string;
    result: string;
  };
}

const ExportControls: React.FC<ExportControlsProps> = ({ moves, playerInfo }) => {
  // Export as CSV
  const exportAsCSV = () => {
    // Create CSV header
    let csvContent = 'Move Number,White,Black\n';
    
    // Add moves to CSV
    moves.forEach(move => {
      csvContent += `${move.moveNumber},"${move.white}","${move.black}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set filename with player names and date
    const filename = `${playerInfo.whitePlayer.replace(/\s+/g, '_')}_vs_${playerInfo.blackPlayer.replace(/\s+/g, '_')}_${playerInfo.date}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Export as PGN
  const exportAsPGN = () => {
    // Create PGN header
    let pgnContent = `[Event "${playerInfo.event}"]\n`;
    pgnContent += `[Date "${playerInfo.date}"]\n`;
    pgnContent += `[White "${playerInfo.whitePlayer}"]\n`;
    pgnContent += `[Black "${playerInfo.blackPlayer}"]\n`;
    pgnContent += `[Result "${playerInfo.result}"]\n\n`;
    
    // Add moves to PGN
    moves.forEach((move, index) => {
      if (index % 5 === 0 && index > 0) {
        pgnContent += '\n';
      }
      pgnContent += `${move.moveNumber}. ${move.white} ${move.black} `;
    });
    
    pgnContent += playerInfo.result;
    
    // Create download link
    const blob = new Blob([pgnContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set filename with player names and date
    const filename = `${playerInfo.whitePlayer.replace(/\s+/g, '_')}_vs_${playerInfo.blackPlayer.replace(/\s+/g, '_')}_${playerInfo.date}.pgn`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={exportAsCSV}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Export as CSV
      </button>
      
      <button
        onClick={exportAsPGN}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        Export as PGN
      </button>
    </div>
  );
};

export default ExportControls; 