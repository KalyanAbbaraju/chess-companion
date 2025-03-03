'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChessMoveNode, ChessGameTree } from '@/lib/types';
import { createPortal } from 'react-dom';
import { useDialog } from '@/components/ui/Dialog';

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
  const { openDialog } = useDialog();
  
  // Scroll to the selected move
  useEffect(() => {
    if (suppressScroll) return;
    
    if (scrollRef.current && gameTree.currentNode) {
      const element = document.getElementById(`move-${gameTree.currentNode}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [gameTree.currentNode, suppressScroll]);
  
  // Render a single move with hover actions
  const renderMove = (node: ChessMoveNode, isSelected: boolean) => {
    return (
      <span
        id={`move-${node.id}`}
        className="group relative inline-flex items-center"
      >
        {/* Move itself - fix shaking by using consistent padding and positioning */}
        <span 
          className={`
            px-1.5 py-0.5 rounded font-mono text-sm cursor-pointer pr-6
            ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
          `}
          onClick={() => onMoveSelect(node.id)}
          onMouseEnter={() => onSuggestionHover && onSuggestionHover(node.move)}
          onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)}
        >
          {node.move}
          {node.annotation && <span className="ml-0.5">{node.annotation}</span>}
        </span>
        
        {/* Action button - always visible on mobile, visible on hover for desktop */}
        <span className="
          absolute right-1 top-1/2 -translate-y-1/2
          sm:opacity-0 sm:group-hover:opacity-100 transition-opacity
          cursor-pointer
        ">
          <ActionMenu 
            node={node}
            onAddComment={(comment) => onAddComment && onAddComment(node.id, comment)}
            onCreateVariation={(move) => onCreateVariation && onCreateVariation(node.id, move)}
            isMainLine={gameTree.mainLine.includes(node.id)}
            onPromoteVariation={() => {
              if (node.parentId) {
                onPromoteVariation && onPromoteVariation([node.parentId, node.id]);
              }
            }}
            onDeleteVariation={() => {
              if (node.parentId) {
                onDeleteVariation && onDeleteVariation([node.parentId, node.id]);
              }
            }}
          />
        </span>
        
        {/* Comment if exists */}
        {node.comment && (
          <span className="ml-1 text-gray-600 italic text-xs">
            {node.comment}
          </span>
        )}
      </span>
    );
  };
  
  // Create a compact action menu component
  const ActionMenu: React.FC<{
    node: ChessMoveNode;
    onAddComment: (comment: string) => void;
    onCreateVariation: (move: string) => void;
    isMainLine: boolean;
    onPromoteVariation: () => void;
    onDeleteVariation: () => void;
  }> = ({ node, onAddComment, onCreateVariation, isMainLine, onPromoteVariation, onDeleteVariation }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, placement: 'bottom' as 'top' | 'bottom' });
    
    // Close menu when clicking outside
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    
    // Calculate and set menu position when opened
    useEffect(() => {
      if (isOpen && buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Check if there's room below
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const menuHeight = 200; // Approximate height
        
        if (spaceBelow < menuHeight) {
          // Position above the button
          setMenuPosition({
            top: buttonRect.top - 5,
            left: buttonRect.right - 150, // Menu width is 150px (w-48 ~= 12rem = 192px)
            placement: 'top'
          });
        } else {
          // Position below the button
          setMenuPosition({
            top: buttonRect.bottom + 5,
            left: buttonRect.right - 150,
            placement: 'bottom'
          });
        }
      }
    }, [isOpen]);
    
    // Add click outside handler
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
            buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);
    
    return (
      <div className="relative">
        {/* Dots menu trigger with larger touch target */}
        <button 
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="text-gray-400 hover:text-gray-700 focus:outline-none p-1 rounded-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        
        {/* Render the menu in a portal */}
        {isOpen && typeof document !== 'undefined' && createPortal(
          <div 
            ref={menuRef}
            style={{ 
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 9999
            }}
            className={`
              fixed w-48
              bg-white rounded-md shadow-xl py-1
              ring-1 ring-black ring-opacity-10
              text-xs
              max-h-[40vh] overflow-y-auto
              border border-gray-200
            `}
          >
            {/* Menu items with the same content as before */}
            <button
              className="flex items-center w-full px-3 py-3 text-left hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                
                // Open custom dialog instead of prompt
                openDialog({
                  type: 'prompt',
                  title: 'Add Comment',
                  message: 'Enter your comment for this move:',
                  initialValue: node.comment || '',
                  onConfirm: (comment) => {
                    if (comment !== undefined) {
                      onAddComment(comment);
                    }
                  }
                });
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              <span className="whitespace-nowrap">Add Comment</span>
            </button>
            
            <button
              className="flex items-center w-full px-3 py-3 text-left hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                
                // Open custom dialog instead of prompt
                openDialog({
                  type: 'prompt',
                  title: 'Add Variation',
                  message: 'Enter the move for the new variation:',
                  initialValue: '',
                  onConfirm: (move) => {
                    if (move) {
                      onCreateVariation(move);
                    }
                  }
                });
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
              </svg>
              <span className="whitespace-nowrap">Add Variation</span>
            </button>
            
            {!isMainLine && (
              <button
                className="flex items-center w-full px-3 py-3 text-left hover:bg-gray-100 text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onPromoteVariation();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="whitespace-nowrap">Promote to Main Line</span>
              </button>
            )}
            
            {!isMainLine && (
              <button
                className="flex items-center w-full px-3 py-3 text-left hover:bg-gray-100 text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  
                  // Open custom confirm dialog
                  openDialog({
                    type: 'confirm',
                    title: 'Delete Variation',
                    message: 'Are you sure you want to delete this variation?',
                    onConfirm: () => {
                      onDeleteVariation();
                    }
                  });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="whitespace-nowrap">Delete Variation</span>
              </button>
            )}
          </div>,
          document.body
        )}
      </div>
    );
  };
  
  // Render the main line in flowing PGN style
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
        <span key={`move-${node.id}`}>
          {renderMove(node, isSelected)}
        </span>
      );
    });
    
    // Process variations
    const processVariations = (nodeId: string, level: number = 0) => {
      const node = gameTree.moves[nodeId];
      if (!node || !node.variations || node.variations.length === 0) {
        return [];
      }
      
      // DEBUG: Log the variations structure to see what we're working with
      console.log(`Processing variations for node ${nodeId} (${node.move}):`, node.variations);
      
      const variationElements: JSX.Element[] = [];
      
      // Process each variation for this node
      node.variations.forEach((variation, varIndex) => {
        if (!variation) {
          console.log("Empty variation detected, skipping");
          return;
        }
        
        // DEBUG: Log the variation format to understand its structure
        console.log(`Variation ${varIndex} format:`, variation);
        
        const varElements: JSX.Element[] = [];
        
        // Add header showing where variation branches from
        varElements.push(
          <span key={`varhead-${node.id}-${varIndex}`} className="text-gray-500 text-xs italic mr-1">
            After {node.moveNumber}.{node.move}:
          </span>
        );
        
        // Handle different variation structures (compatibility)
        let moveIds: string[] = [];
        
        if (Array.isArray(variation)) {
          // If it's a plain array of move IDs (expected format)
          moveIds = variation;
          console.log("Array variation with moveIds:", moveIds);
        } else if (variation.moves) {
          // If it has a moves property (legacy format)
          moveIds = variation.moves;
          console.log("Object variation with moves property:", moveIds);
        } else {
          console.log("Unknown variation format:", variation);
          return; // Skip this variation if we can't parse it
        }
        
        if (moveIds.length === 0) {
          console.log("No move IDs in variation, skipping");
          return;
        }
        
        // Log all move nodes to verify they exist
        console.log("Move nodes in this variation:", moveIds.map(id => gameTree.moves[id] ? 
          `${id}: ${gameTree.moves[id].move}` : `${id}: NOT FOUND`));
        
        // Add all moves in this variation
        let lastShownMoveNumber = 0;
        
        moveIds.forEach((varNodeId, moveIndex) => {
          const varNode = gameTree.moves[varNodeId];
          if (!varNode) {
            console.error("Node not found for ID:", varNodeId);
            return;
          }
          
          // Show move number for the first move or for white moves
          if (moveIndex === 0 || (varNode.color === 'w' && lastShownMoveNumber !== varNode.moveNumber)) {
            const moveNumber = varNode.moveNumber || 0;
            lastShownMoveNumber = moveNumber;
            
            // Add move number
            const moveNumText = moveIndex === 0 && varNode.color === 'b' ? 
              `${moveNumber}...` : 
              `${moveNumber}.`;
              
            varElements.push(
              <span key={`varnum-${varNode.id}-${moveIndex}`} className="text-gray-500 text-xs mr-0.5">
                {moveNumText}
              </span>
            );
          }
          
          // Add the move
          const isVarSelected = gameTree.currentNode === varNode.id;
          varElements.push(
            <span key={`varmove-${varNode.id}`}>
              {renderMove(varNode, isVarSelected)}
            </span>
          );
        });
        
        // Only add action buttons if we have a valid variation
        if (moveIds.length > 0 && gameTree.moves[moveIds[0]]) {
          // Add variation actions (promote/delete)
          const firstMoveId = moveIds[0];
          varElements.push(
            <span key={`var-actions-${node.id}-${varIndex}`} className="text-xs ml-2">
              <button 
                className="text-blue-500 hover:text-blue-700 mr-1"
                onClick={() => onPromoteVariation && onPromoteVariation([node.id, firstMoveId])}
              >
                promote
              </button>
              <button 
                className="text-red-500 hover:text-red-700"
                onClick={() => onDeleteVariation && onDeleteVariation([node.id, firstMoveId])}
              >
                delete
              </button>
            </span>
          );
        }
        
        // Add this variation to the list with a unique key
        variationElements.push(
          <div
            key={`var-${node.id}-${varIndex}-${level}`}
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
        
        // Recursively add nested variations for each move in this variation
        moveIds.forEach((varNodeId) => {
          const nestedVars = processVariations(varNodeId, level + 1);
          if (nestedVars.length > 0) {
            variationElements.push(...nestedVars);
          }
        });
      });
      
      return variationElements;
    };
    
    // Process all variations starting from main line nodes
    const allVariationElements: JSX.Element[] = [];
    gameTree.mainLine.forEach(nodeId => {
      // Debug this node's variations
      const node = gameTree.moves[nodeId];
      if (node && node.variations && node.variations.length > 0) {
        console.log(`Main line node ${node.id} (${node.move}) has ${node.variations.length} variations`);
      }

      const nodeVariations = processVariations(nodeId);
      if (nodeVariations.length > 0) {
        allVariationElements.push(...nodeVariations);
      }
    });
    
    // Return the complete view
    return (
      <div className="pgn-view">
        <div className="main-line mb-1 flex flex-wrap items-center bg-gray-50 p-2 rounded text-sm">
          {mainLineElements}
        </div>
        
        {allVariationElements.length > 0 ? (
          <div className="variations mt-2">
            <div className="text-xs text-gray-700 mb-0.5 font-medium">
              Variations ({allVariationElements.length})
            </div>
            {allVariationElements}
          </div>
        ) : (
          <div className="text-xs text-gray-500 mt-2">
            No variations yet. Create a variation by making an alternative move.
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div
      className="game-tree-container bg-white p-2 rounded-lg border border-gray-200 h-full overflow-auto font-['Inter',system-ui,sans-serif]"
      ref={scrollRef}
    >
      {renderPGNStyle()}
    </div>
  );
};

export default GameTreeView;