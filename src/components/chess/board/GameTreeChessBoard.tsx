'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { PlayerInfo, ChessGameTree } from '@/lib/types';
import ChessBoardWithPlayers from './ChessBoardWithPlayers';
import GameTreeView from '../notation/GameTreeView';
import NavigationControls from '../navigation/NavigationControls';
import { getCapturedPieces } from '../utils/ChessBoardUtils';
import { 
  playMove, 
  createVariation, 
  promoteVariation, 
  deleteVariation, 
  addComment,
  convertMovesToGameTree,
  convertGameTreeToMoves
} from '@/lib/gameTree';
import TabularGameTreeView from '../notation/TabularGameTreeView';
import { Tab } from '@headlessui/react';

interface GameTreeChessBoardProps {
  initialGameTree?: ChessGameTree;
  playerInfo: PlayerInfo;
  onGameTreeUpdate?: (gameTree: ChessGameTree) => void;
  onPlayerInfoUpdate?: (info: Partial<PlayerInfo>) => void;
}

const GameTreeChessBoard: React.FC<GameTreeChessBoardProps> = ({
  initialGameTree,
  playerInfo,
  onGameTreeUpdate,
  onPlayerInfoUpdate
}) => {
  // Initialize with empty game tree if none provided
  const [gameTree, setGameTree] = useState<ChessGameTree>(
    initialGameTree || {
      id: 'new-game',
      rootPosition: new Chess().fen(),
      currentNode: '',
      moves: {},
      mainLine: []
    }
  );
  
  const [currentPosition, setCurrentPosition] = useState<string>(() => {
    // Check if we have a valid current node with a valid move entry
    if (gameTree.currentNode && gameTree.moves && gameTree.moves[gameTree.currentNode]) {
      return gameTree.moves[gameTree.currentNode].fen;
    }
    // Otherwise use the root position or default starting position
    return gameTree.rootPosition || new Chess().fen();
  });
  
  const [capturedPieces, setCapturedPieces] = useState<{white: string[], black: string[]}>({
    white: [], 
    black: []
  });
  
  const [suggestedMove, setSuggestedMove] = useState<string | null>(null);
  
  const [viewType, setViewType] = useState<'tree' | 'table'>('tree');
  
  // Add keyboard navigation to GameTreeChessBoard component
  const [keyboardFocus, setKeyboardFocus] = useState<{
    nodeId: string;
    inVariation: boolean;
    variationPath?: string[];
  }>({
    nodeId: gameTree.currentNode || '',
    inVariation: false,
    variationPath: []
  });
  
  // Add a ref to track if chess moves are coming from the board
  const boardMoveRef = useRef(false);
  
  // When the game tree or current node changes, update the board position
  useEffect(() => {
    if (gameTree.currentNode && gameTree.moves && gameTree.moves[gameTree.currentNode]) {
      setCurrentPosition(gameTree.moves[gameTree.currentNode].fen);
      setCapturedPieces(getCapturedPieces(gameTree.moves[gameTree.currentNode].fen));
    } else if (gameTree.mainLine && gameTree.mainLine.length > 0) {
      // If no current node but we have moves, set to the last move
      const lastNodeId = gameTree.mainLine[gameTree.mainLine.length - 1];
      if (gameTree.moves && gameTree.moves[lastNodeId]) {
        setCurrentPosition(gameTree.moves[lastNodeId].fen);
        setCapturedPieces(getCapturedPieces(gameTree.moves[lastNodeId].fen));
      } else {
        // Fallback to root position
        setCurrentPosition(gameTree.rootPosition || new Chess().fen());
        setCapturedPieces({ white: [], black: [] });
      }
    } else {
      // Empty game
      setCurrentPosition(gameTree.rootPosition || new Chess().fen());
      setCapturedPieces({ white: [], black: [] });
    }
  }, [gameTree]);
  
  // Update handleMoveSelect to track keyboard focus
  const handleMoveSelect = useCallback((nodeId: string) => {
    // Check if this node is in a variation
    const node = gameTree.moves[nodeId];
    const isInVariation = !gameTree.mainLine.includes(nodeId);
    
    // Update keyboard focus
    setKeyboardFocus({
      nodeId,
      inVariation: isInVariation,
      variationPath: isInVariation ? [nodeId] : [] // Simplified path tracking
    });
    
    // Original logic to update game tree
    setGameTree(prevTree => ({
      ...prevTree,
      currentNode: nodeId
    }));
    
    // Clear any suggested moves
    setSuggestedMove(null);
  }, [gameTree.moves, gameTree.mainLine]);
  
  // Handle move suggestion hover
  const handleSuggestionHover = useCallback((move: string | null) => {
    setSuggestedMove(move);
  }, []);
  
  // Navigation control handlers
  const goToStart = useCallback(() => {
    // Navigate to the first move in the main line (or root position if no moves)
    if (gameTree.mainLine && gameTree.mainLine.length > 0) {
      setGameTree(prevTree => ({
        ...prevTree,
        currentNode: ''
      }));
    }
  }, [gameTree.mainLine]);
  
  const goToEnd = useCallback(() => {
    if (gameTree.mainLine.length > 0) {
      const lastNodeId = gameTree.mainLine[gameTree.mainLine.length - 1];
      setGameTree(prevTree => ({
        ...prevTree,
        currentNode: lastNodeId
      }));
    }
  }, [gameTree.mainLine]);
  
  const goToPrevious = useCallback(() => {
    // If no current node, we're at the start
    if (!gameTree.currentNode) return;
    
    // Get the index of the current node in the main line
    const currentNodeIndex = gameTree.mainLine.indexOf(gameTree.currentNode);
    
    // If the node is in the main line
    if (currentNodeIndex > 0) {
      // Go to the previous node in the main line
      const prevNodeId = gameTree.mainLine[currentNodeIndex - 1];
      setGameTree(prevTree => ({
        ...prevTree,
        currentNode: prevNodeId
      }));
    } else if (currentNodeIndex === 0) {
      // Go to root position
      setGameTree(prevTree => ({
        ...prevTree,
        currentNode: ''
      }));
    } else {
      // Node is not in main line, need to find its position in variations
      // Logic for navigating variations
    }
  }, [gameTree.currentNode, gameTree.mainLine]);
  
  const goToNext = useCallback(() => {
    if (gameTree.currentNode) {
      const currentNode = gameTree.moves[gameTree.currentNode];
      if (currentNode && currentNode.isMainLine) {
        const currentIndex = gameTree.mainLine.indexOf(gameTree.currentNode);
        if (currentIndex >= 0 && currentIndex < gameTree.mainLine.length - 1) {
          const nextNodeId = gameTree.mainLine[currentIndex + 1];
          setGameTree(prevTree => ({
            ...prevTree,
            currentNode: nextNodeId
          }));
        }
      } else if (currentNode && currentNode.parentId) {
        // In a variation, find the next move in the variation
        const parentNode = gameTree.moves[currentNode.parentId];
        if (parentNode) {
          for (const variation of parentNode.variations) {
            const nodeIndex = variation.findIndex(node => node.id === gameTree.currentNode);
            if (nodeIndex >= 0 && nodeIndex < variation.length - 1) {
              const nextNodeId = variation[nodeIndex + 1].id;
              setGameTree(prevTree => ({
                ...prevTree,
                currentNode: nextNodeId
              }));
              break;
            }
          }
        }
      }
    } else if (gameTree.mainLine.length > 0) {
      // At start position, go to first move
      setGameTree(prevTree => ({
        ...prevTree,
        currentNode: gameTree.mainLine[0]
      }));
    }
  }, [gameTree.currentNode, gameTree.mainLine, gameTree.moves]);
  
  // Get description of current move
  const getMoveDescription = useCallback(() => {
    if (!gameTree.currentNode) {
      return 'Starting position';
    }
    
    if (!gameTree.moves) {
      return 'Unknown position';
    }
    
    const node = gameTree.moves[gameTree.currentNode];
    if (!node) {
      return 'Unknown position';
    }
    
    // Return the move description
    return `${node.moveNumber}${node.color === 'b' ? '...' : '.'} ${node.move}`;
  }, [gameTree.currentNode, gameTree.moves]);
  
  // Fix the turn detection logic
  // The color in the node represents who just moved, so the next turn is the opposite
  const nextTurn = currentPosition ? new Chess(currentPosition).turn() : 'w';
  
  // This uses the chess.js library to directly get whose turn it is from the position
  // This is more reliable than trying to determine it from the node structure
  
  // Update the handlePositionChange function to set the board move flag
  const handlePositionChange = useCallback((newPosition: string) => {
    if (currentPosition === newPosition) return; // No change
    
    // Detect if this is a user move on the board 
    boardMoveRef.current = true;
    
    // We need to determine what move was made
    const chess = new Chess();
    let moveString = "";
    
    // Load the previous position
    if (gameTree.currentNode && gameTree.moves[gameTree.currentNode]) {
      // We're at a node, load its position
      chess.load(gameTree.moves[gameTree.currentNode].fen);
    } else {
      // We're at the root position
      chess.load(gameTree.rootPosition);
    }
    
    // Find what move would transform the previous position to the new one
    // We compare positions by playing each legal move and seeing if it matches
    const legalMoves = chess.moves({ verbose: true });
    
    for (const move of legalMoves) {
      const testChess = new Chess(chess.fen());
      testChess.move(move);
      
      if (testChess.fen() === newPosition) {
        moveString = move.san;
        break;
      }
    }
    
    if (!moveString) {
      console.error("Could not determine the move that was made");
      return;
    }
    
    console.log("User made move:", moveString);
    
    // Now update the game tree
    setGameTree(prevTree => {
      // Check if we're creating a new variation
      const isCreatingVariation = shouldCreateVariation(prevTree, moveString);
      console.log("Creating variation?", isCreatingVariation);
      
      const newTree = playMove(prevTree, moveString);
      
      // Notify parent component of the update
      setTimeout(() => onGameTreeUpdate && onGameTreeUpdate(newTree), 0);
      
      return newTree;
    });
    
    // Clear any suggested moves
    setSuggestedMove(null);
    
    // Reset the board move flag after a short delay to allow state updates
    setTimeout(() => { boardMoveRef.current = false; }, 100);
  }, [currentPosition, gameTree]);
  
  // Add a helper function to determine if we should create a variation
  const shouldCreateVariation = (tree: ChessGameTree, move: string): boolean => {
    // If we're not at a node, or we're at the end of the main line, it's not a variation
    if (!tree.currentNode) return false;
    
    const currentNode = tree.moves[tree.currentNode];
    if (!currentNode) return false;
    
    // Check if this is the last node in the main line
    const isLastInMainLine = 
      tree.mainLine.length > 0 && 
      tree.mainLine[tree.mainLine.length - 1] === tree.currentNode;
    
    if (isLastInMainLine) return false;
    
    // Check if the move already exists in the next move of the main line
    const currentIndex = tree.mainLine.indexOf(tree.currentNode);
    if (currentIndex >= 0 && currentIndex < tree.mainLine.length - 1) {
      const nextNodeId = tree.mainLine[currentIndex + 1];
      const nextNode = tree.moves[nextNodeId];
      if (nextNode && nextNode.move === move) {
        // This is just navigating to the next move in the main line
        return false;
      }
    }
    
    // Otherwise, we're creating a variation
    return true;
  }
  
  // Handle creating a variation
  const handleCreateVariation = useCallback((parentId: string, move: string) => {
    const updatedTree = createVariation(gameTree, parentId, move);
    setGameTree(updatedTree);
    
    // Notify parent component if needed
    if (onGameTreeUpdate) {
      onGameTreeUpdate(updatedTree);
    }
  }, [gameTree, onGameTreeUpdate]);
  
  // Handle promoting a variation to main line
  const handlePromoteVariation = useCallback((variationPath: number[]) => {
    const updatedTree = promoteVariation(gameTree, variationPath);
    setGameTree(updatedTree);
    
    // Notify parent component if needed
    if (onGameTreeUpdate) {
      onGameTreeUpdate(updatedTree);
    }
  }, [gameTree, onGameTreeUpdate]);
  
  // Handle deleting a variation
  const handleDeleteVariation = useCallback((variationPath: number[]) => {
    const updatedTree = deleteVariation(gameTree, variationPath);
    setGameTree(updatedTree);
    
    // Notify parent component if needed
    if (onGameTreeUpdate) {
      onGameTreeUpdate(updatedTree);
    }
  }, [gameTree, onGameTreeUpdate]);
  
  // Handle adding a comment to a move
  const handleAddComment = useCallback((nodeId: string, comment: string) => {
    const updatedTree = addComment(gameTree, nodeId, comment);
    setGameTree(updatedTree);
    
    // Notify parent component if needed
    if (onGameTreeUpdate) {
      onGameTreeUpdate(updatedTree);
    }
  }, [gameTree, onGameTreeUpdate]);
  
  // Add this effect to reset the board move flag after rendering
  useEffect(() => {
    // Reset the flag after a render cycle
    const timer = setTimeout(() => {
      boardMoveRef.current = false;
    }, 100);
    
    return () => clearTimeout(timer);
  });
  
  // Navigate from a variation to the main line at a similar position
  const navigateToMainLine = useCallback(() => {
    if (!gameTree.currentNode) return;
    
    const currentNode = gameTree.moves[gameTree.currentNode];
    if (!currentNode) return;
    
    // If already in main line, do nothing
    if (gameTree.mainLine.includes(gameTree.currentNode)) {
      return;
    }
    
    // Find a corresponding position in the main line
    // Usually this would be the same move number
    const targetMoveNumber = currentNode.moveNumber;
    
    // Look for a move in the main line with the same move number
    for (const nodeId of gameTree.mainLine) {
      const node = gameTree.moves[nodeId];
      if (node.moveNumber === targetMoveNumber && node.color === currentNode.color) {
        setGameTree(prevTree => ({
          ...prevTree,
          currentNode: nodeId
        }));
        
        // Update keyboard focus
        setKeyboardFocus({
          nodeId,
          inVariation: false,
          variationPath: []
        });
        
        return;
      }
    }
    
    // If no matching move found, go to the parent node's position in the main line
    if (currentNode.parentId) {
      const parentNode = gameTree.moves[currentNode.parentId];
      if (parentNode && gameTree.mainLine.includes(parentNode.id)) {
        setGameTree(prevTree => ({
          ...prevTree,
          currentNode: parentNode.id
        }));
        
        // Update keyboard focus
        setKeyboardFocus({
          nodeId: parentNode.id,
          inVariation: false,
          variationPath: []
        });
      }
    }
  }, [gameTree.currentNode, gameTree.moves, gameTree.mainLine]);
  
  // Navigate from a main line move to a variation if one exists
  const navigateToVariation = useCallback(() => {
    if (!gameTree.currentNode && gameTree.mainLine.length === 0) return;
    
    const nodeId = gameTree.currentNode || gameTree.mainLine[0];
    const node = gameTree.moves[nodeId];
    
    if (!node) return;
    
    // Check if this node has any variations
    if (node.variations && node.variations.length > 0) {
      // Navigate to the first move of the first variation
      const firstVariation = node.variations[0];
      if (firstVariation && firstVariation.length > 0) {
        const firstVarNodeId = firstVariation[0];
        
        setGameTree(prevTree => ({
          ...prevTree,
          currentNode: firstVarNodeId
        }));
        
        // Update keyboard focus
        setKeyboardFocus({
          nodeId: firstVarNodeId,
          inVariation: true,
          variationPath: [nodeId, firstVarNodeId]
        });
      }
    }
  }, [gameTree.currentNode, gameTree.moves, gameTree.mainLine]);
  
  // Fix 2: Then add a memoized keyboard handler function
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if we're in an input field
    if (
      e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }
    
    switch (e.key) {
      case 'ArrowLeft':
        goToPrevious();
        break;
      case 'ArrowRight':
        goToNext();
        break;
      case 'ArrowUp':
        navigateToMainLine();
        break;
      case 'ArrowDown':
        navigateToVariation();
        break;
      case 'Home':
        goToStart();
        break;
      case 'End':
        goToEnd();
        break;
      default:
        break;
    }
  }, [goToNext, goToPrevious, goToStart, goToEnd, navigateToMainLine, navigateToVariation]);
  
  // Fix 3: Finally, update the keyboard effect to use the memoized handler
  useEffect(() => {
    // Add the keyboard event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]); // Only depend on the memoized handler
  
  // Add this after the existing imports
  const debugGameTree = (gameTree: ChessGameTree) => {
    console.log("GAME TREE DEBUG:");
    console.log("Current node:", gameTree.currentNode);
    console.log("Main line:", gameTree.mainLine);
    console.log("Moves:", Object.keys(gameTree.moves).length);
    
    // Check variations
    let variationsCount = 0;
    Object.values(gameTree.moves).forEach(node => {
      if (node.variations && node.variations.length > 0) {
        variationsCount += node.variations.length;
        console.log(`Node ${node.id} (${node.move}) has ${node.variations.length} variations:`, 
          node.variations.map(v => Array.isArray(v) ? v[0] : v.moves?.[0]));
      }
    });
    console.log("Total variations:", variationsCount);
  };
  
  // Call this inside the handlePositionChange function, right after making the move:
  setTimeout(() => {
    debugGameTree(gameTree);
  }, 200);
  
  // Add a debug function to check variations after each move
  const debugVariations = (gameTree: ChessGameTree) => {
    console.log("======= VARIATIONS DEBUG =======");
    let totalVariations = 0;
    
    gameTree.mainLine.forEach(nodeId => {
      const node = gameTree.moves[nodeId];
      if (node && node.variations && node.variations.length > 0) {
        totalVariations += node.variations.length;
        console.log(`Node ${nodeId} (${node.move}) has ${node.variations.length} variations:`);
        
        node.variations.forEach((variation, idx) => {
          console.log(`  Variation ${idx} format:`, variation);
          
          const moveIds = Array.isArray(variation) ? variation : (variation.moves || []);
          if (moveIds.length > 0) {
            const firstMoveId = moveIds[0];
            const firstMove = gameTree.moves[firstMoveId];
            console.log(`  First move: ${firstMoveId} -> ${firstMove ? firstMove.move : 'NOT FOUND'}`);
          } else {
            console.log(`  Empty variation`);
          }
        });
      }
    });
    
    console.log(`Total variations: ${totalVariations}`);
    console.log("===============================");
  };
  
  // Call this in handlePositionChange after updating the game tree
  setTimeout(() => {
    debugVariations(gameTree);
  }, 50);
  
  return (
    <div className="card bg-white shadow-md">
      <div className="card-body p-3 sm:p-5">
        {/* Game metadata at the top */}
        <div className="w-full mb-3">
          <h2 className="text-lg font-medium mb-1">
            {playerInfo.event || 'Chess Game'}
          </h2>
          <div className="text-sm text-gray-700 flex flex-wrap justify-start items-center gap-1 sm:gap-3">
            <span className={`font-medium rounded px-2 py-1 ${nextTurn === 'w' ? 'bg-white text-black border border-gray-300 shadow-sm' : ''}`}>
              {playerInfo.whitePlayer || 'White'}
            </span>
            <span>vs</span>
            <span className={`font-medium rounded px-2 py-1 ${nextTurn === 'b' ? 'bg-gray-800 text-white' : ''}`}>
              {playerInfo.blackPlayer || 'Black'}
            </span>
            {playerInfo.date && (
              <span className="text-gray-500">
                {playerInfo.date}
              </span>
            )}
            {playerInfo.result && playerInfo.result !== '*' && (
              <span className="font-medium">{playerInfo.result}</span>
            )}
          </div>
        </div>
        
        {/* Improve the layout to eliminate wasted space */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left column: Chess board and navigation controls - now 7/12 instead of 2/3 */}
          <div className="lg:col-span-7">
            {/* Remove extra padding and make the board fill the container */}
            <div className="bg-gray-50 rounded-lg flex items-center justify-center p-0">
              <div className="w-full">
                <ChessBoardWithPlayers
                  currentPosition={currentPosition}
                  capturedPieces={capturedPieces}
                  whitePlayerName={playerInfo.whitePlayer || 'White'}
                  blackPlayerName={playerInfo.blackPlayer || 'Black'}
                  onPositionChange={handlePositionChange}
                  isEditMode={true}
                  suggestedMove={suggestedMove}
                  currentTurn={nextTurn}
                />
              </div>
            </div>
            
            {/* Navigation controls below board */}
            <div className="mt-2 mb-3">
              <NavigationControls
                currentMoveIndex={gameTree.mainLine ? gameTree.mainLine.indexOf(gameTree.currentNode) : -1}
                historyLength={gameTree.mainLine ? gameTree.mainLine.length : 0}
                goToStart={goToStart}
                goToPrevious={goToPrevious}
                goToNext={goToNext}
                goToEnd={goToEnd}
                moveDescription={getMoveDescription()}
              />
            </div>
            
            {/* Keyboard navigation help - only on larger screens */}
            <div className="hidden lg:flex text-xs text-gray-500 mb-3 justify-between items-center">
              <div>
                <span className="font-medium">Keyboard navigation:</span>{" "}
                <span className="bg-gray-100 px-1 rounded">←</span> Previous{" "}
                <span className="bg-gray-100 px-1 rounded">→</span> Next{" "}
                <span className="bg-gray-100 px-1 rounded">↑</span> Main line{" "}
                <span className="bg-gray-100 px-1 rounded">↓</span> Variation{" "}
                <span className="bg-gray-100 px-1 rounded">Home</span> Start{" "}
                <span className="bg-gray-100 px-1 rounded">End</span> Final
              </div>
              <div>
                {keyboardFocus.inVariation && (
                  <span className="text-blue-600">Navigating variation</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Right column: Tree/Notation view - now 5/12 instead of 1/3 */}
          <div className="lg:col-span-5">
            {/* View type tabs */}
            <div className="flex border-b border-gray-200 bg-white rounded-t-lg">
              <button 
                onClick={() => setViewType('tree')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewType === 'tree' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tree View
              </button>
              <button 
                onClick={() => setViewType('table')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewType === 'table' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Table View
              </button>
            </div>
            
            {/* Tree/Table content with fixed height on desktop */}
            <div className="bg-white border border-gray-200 rounded-b-lg p-3 lg:h-[60vh] overflow-auto">
              {viewType === 'tree' ? (
                <GameTreeView
                  gameTree={gameTree}
                  onMoveSelect={handleMoveSelect}
                  onCreateVariation={handleCreateVariation}
                  onPromoteVariation={handlePromoteVariation}
                  onDeleteVariation={handleDeleteVariation}
                  onAddComment={handleAddComment}
                  onSuggestionHover={handleSuggestionHover}
                  suppressScroll={boardMoveRef.current}
                />
              ) : (
                <TabularGameTreeView
                  gameTree={gameTree}
                  onMoveSelect={handleMoveSelect}
                  onSuggestionHover={handleSuggestionHover}
                  suppressScroll={boardMoveRef.current}
                />
              )}
            </div>
            
            {/* Keyboard navigation help - mobile only */}
            <div className="flex lg:hidden text-xs text-gray-500 mt-2 mb-3 justify-between items-center">
              <div>
                <span className="font-medium">Keyboard navigation:</span>{" "}
                <span className="bg-gray-100 px-1 rounded">←→</span> Navigate{" "}
                <span className="bg-gray-100 px-1 rounded">↑↓</span> Variation
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameTreeChessBoard;