import React, { useState } from 'react';
import GameTreeChessBoard from '../GameTreeChessBoard';
import { convertMovesToGameTree, convertGameTreeToMoves } from '../../utils/gameTreeUtils';

const ScoreSheetScanner: React.FC = () => {
  const [digitizedMoves, setDigitizedMoves] = useState<string[]>([]);
  const [playerInfo, setPlayerInfo] = useState<any>(null);

  const handleMovesUpdate = (moves: string[]) => {
    setDigitizedMoves(moves);
  };

  const handlePlayerInfoUpdate = (info: any) => {
    setPlayerInfo(info);
  };

  return (
    <GameTreeChessBoard 
      initialGameTree={convertMovesToGameTree(digitizedMoves, playerInfo)}
      playerInfo={playerInfo}
      onGameTreeUpdate={(gameTree) => {
        // Convert back to legacy format for compatibility
        const moves = convertGameTreeToMoves(gameTree);
        handleMovesUpdate(moves);
      }}
      onPlayerInfoUpdate={handlePlayerInfoUpdate}
    />
  );
};

export default ScoreSheetScanner; 