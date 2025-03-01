'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChessMoveNode, ChessGameTree } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface GameTreeViewProps {
  gameTree: ChessGameTree;
  onMoveSelect: (nodeId: string) => void;
  onCreateVariation?: (parentId: string, move: string) => void;
  onPromoteVariation?: (variationPath: number[]) => void;
  onDeleteVariation?: (variationPath: number[]) => void;
  onAddComment?: (nodeId: string, comment: string) => void;
  onSuggestionHover?: (move: string | null) => void;
  suppressScroll?: boolean;
}

const GameTreeView: React.FC<GameTreeViewProps> = ({
  gameTree,
  onMoveSelect,
  onCreateVariation,
  onPromoteVariation,
  onDeleteVariation,
  onAddComment,
  onSuggestionHover,
  suppressScroll
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Replace both useEffect hooks with a single consolidated one
  useEffect(() => {
    // Skip scrolling entirely if suppressScroll is true
    if (suppressScroll) {
      return;
    }
    
    // Find the selected move element and scroll it into view
    if (scrollRef.current && gameTree.currentNode) {
      const element = document.getElementById(`move-${gameTree.currentNode}`);
      if (element) {
        // Scroll to the element with smooth animation
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [gameTree.currentNode, suppressScroll]);
  
  // Simple PGN-style notation
  const renderPGNStyle = () => {
    // If there are no moves, show a placeholder
    if (!gameTree.mainLine || gameTree.mainLine.length === 0) {
      return (
        <div className="text-gray-500 italic">
          No moves yet. Make a move on the board to start.
        </div>
      );
    }
    
    // Process main line
    const mainLineElements: JSX.Element[] = [];
    let lastMoveNumberShown = 0;
    
    // Add main line moves
    gameTree.mainLine.forEach((nodeId, index) => {
      const node = gameTree.moves[nodeId];
      if (!node) return;
      
      // Add move number for white or first move of game
      if (node.color === 'w' || index === 0) {
        // Show move number
        const moveNumberText = node.color === 'w' ? 
          `${node.moveNumber}.` : 
          `${node.moveNumber}...`;
          
        mainLineElements.push(
          <span key={`num-${node.id}`} className="text-gray-500 text-xs mr-0.5">
            {moveNumberText}
          </span>
        );
        
        lastMoveNumberShown = node.moveNumber;
      }
      
      // Add the move itself
      const isSelected = gameTree.currentNode === node.id;
      mainLineElements.push(
        <span
          key={`move-${node.id}`} 
          id={`move-${node.id}`}
          className={`
            inline-block px-1 py-0.5 mr-0.5 rounded cursor-pointer text-sm font-mono
            ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
          `}
          onClick={() => handleMoveClick(node.id)}
          onDoubleClick={() => {
            const comment = prompt('Enter comment:', node.comment || '');
            if (comment !== null) {
              onAddComment && onAddComment(node.id, comment);
            }
          }}
          onMouseEnter={() => onSuggestionHover && onSuggestionHover(node.move)}
          onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)}
        >
          {node.move}
          {node.annotation && <span className="text-orange-500">{node.annotation}</span>}
        </span>
      );
      
      // Add comment if exists
      if (node.comment) {
        mainLineElements.push(
          <span key={`comment-${node.id}`} className="text-gray-600 italic text-xs mr-1">
            {node.comment}
          </span>
        );
      }
    });
    
    // Process variations recursively (for all levels of nesting)
    const processVariations = (nodeId: string, level: number = 0): JSX.Element[] => {
      const node = gameTree.moves[nodeId];
      if (!node || !node.variations || node.variations.length === 0) return [];
      
      const variationElements: JSX.Element[] = [];
      
      // Process each variation for this node
      node.variations.forEach((variation, varIndex) => {
        if (!variation || !variation.moves || variation.moves.length === 0) return;
        
        console.log(`Processing variation ID: ${variation.id} at level ${level}`);
        
        // Create elements array for this variation
        const varElements: JSX.Element[] = [];
        
        // Add header showing where variation branches from with parent information
        varElements.push(
          <span key={`varhead-${node.id}-${varIndex}`} className="text-gray-500 text-xs italic mr-1">
            After {node.moveNumber}.{node.move}:
          </span>
        );
        
        // Track last move number shown in this variation
        let varLastMoveShown = 0;
        
        // Process all moves in this variation (up to a reasonable limit)
        const maxMovesToShow = 20; // Increased for deeper variations
        const limitedMoves = variation.moves.slice(0, maxMovesToShow);
        
        // Process the moves in this variation
        limitedMoves.forEach((varNodeId, moveIndex) => {
          const varNode = gameTree.moves[varNodeId];
          if (!varNode) {
            console.error(`Node not found for variation ID: ${varNodeId}`);
            return;
          }
          
          // Show move number at start or for white moves
          if (moveIndex === 0 || (varNode.color === 'w' && varLastMoveShown !== varNode.moveNumber)) {
            varLastMoveShown = varNode.moveNumber || 0;
            
            // Just show the move number with a dot
            const moveNumText = `${varNode.moveNumber || '?'}.`;
              
            varElements.push(
              <span key={`varnum-${varNode.id}-${moveIndex}`} className="text-gray-500 text-xs mr-0.5">
                {moveNumText}
              </span>
            );
          }
          
          // Add the variation move
          const isVarSelected = gameTree.currentNode === varNode.id;
          varElements.push(
            <span
              key={`varmove-${varNode.id}`}
              id={`move-${varNode.id}`}
              className={`
                inline-block px-1 py-0.5 mr-0.5 rounded cursor-pointer text-sm font-mono
                ${isVarSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 text-blue-600'}
              `}
              onClick={() => handleMoveClick(varNode.id)}
              onMouseEnter={() => onSuggestionHover && onSuggestionHover(varNode.move)}
              onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)}
            >
              {varNode.move || '?'}
            </span>
          );
          
          // Add comment if it exists
          if (varNode.comment) {
            varElements.push(
              <span key={`varcomment-${varNode.id}`} className="text-gray-600 italic text-xs mr-1">
                {varNode.comment}
              </span>
            );
          }
          
          // Process sub-variations for this move recursively and add them to the list
          const subVariations = processVariations(varNodeId, level + 1);
          
          // If there are sub-variations, add them after this move
          if (subVariations.length > 0) {
            varElements.push(
              <div key={`subvar-${varNode.id}`} className="w-full">
                {subVariations}
              </div>
            );
          }
        });
        
        // Add this variation to the list if it has any elements
        if (varElements.length > 1) { // More than just the header
          variationElements.push(
            <div
              key={`var-${node.id}-${varIndex}`}
              className={`
                variation-line pl-2 py-0.5 border-l-2 
                ${level === 0 ? 'border-blue-200' : level === 1 ? 'border-green-200' : 'border-purple-200'} 
                mb-0.5 flex flex-wrap items-center
                ${level > 0 ? 'ml-' + (2 * level) : ''}
              `}
            >
              {varElements}
            </div>
          );
        }
      });
      
      return variationElements;
    };
    
    // Process all variations starting from main line nodes
    const allVariationElements: JSX.Element[] = [];
    gameTree.mainLine.forEach(nodeId => {
      const nodeVariations = processVariations(nodeId);
      if (nodeVariations.length > 0) {
        allVariationElements.push(...nodeVariations);
      }
    });
    
    // Return the complete view
    return (
      <div className="pgn-view">
        <div className="main-line mb-1 flex flex-wrap items-center bg-gray-50 p-1.5 rounded text-sm">
          {mainLineElements}
        </div>
        
        {allVariationElements.length > 0 && (
          <div className="variations mt-1">
            <div className="text-xs text-gray-700 mb-0.5 font-medium">Variations:</div>
            {allVariationElements}
          </div>
        )}
      </div>
    );
  };
  
  // Fix the variation rendering in GameTreeView
  const renderVariation = (nodeId: string, varIndex: number) => {
    const node = gameTree.moves[nodeId];
    if (!node) return null;
    
    // Ensure variations exist
    if (!node.variations || !Array.isArray(node.variations)) {
      console.error(`No variations found for node ${nodeId}:`, node.variations);
      return null;
    }

    const variationLine = node.variations[varIndex];
    
    // Log the variation line to check its structure
    console.log(`Processing variation line for node ${nodeId}:`, variationLine);

    // Check if variationLine is an array
    if (!Array.isArray(variationLine)) {
      console.error(`Expected variationLine to be an array, but got:`, variationLine);
      return null;
    }

    // Add all moves in this variation
    variationLine.forEach((varNodeId, moveIndex) => {
      // Make sure we have a valid node ID
      if (typeof varNodeId !== 'string' || !gameTree.moves[varNodeId]) return;

      const varNode = gameTree.moves[varNodeId];

      // Your existing logic for rendering the moves...
    });
  };
  
  // Modify the onClick handler to allow focusing when directly clicked
  const handleMoveClick = (nodeId: string) => {
    // When a user clicks a move in the notation, we do want to focus on it
    onMoveSelect(nodeId);
  };
  
  return (
    <div 
      className="game-tree-container bg-white p-2 rounded-lg border border-gray-200 h-full overflow-auto font-['IBM_Plex_Sans',system-ui,sans-serif]" 
      ref={scrollRef}
    >
      {renderPGNStyle()}
    </div>
  );
};

export default GameTreeView;