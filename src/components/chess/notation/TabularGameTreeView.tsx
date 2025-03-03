import React, { useEffect, useRef, useState } from 'react';
import { ChessGameTree, ChessMoveNode } from '@/lib/types';

interface TabularGameTreeViewProps {
  gameTree: ChessGameTree;
  onMoveSelect: (nodeId: string) => void;
  onSuggestionHover?: (move: string | null) => void;
}

interface MoveCell {
  nodeId: string;
  move: string;
  comment?: string;
  selected: boolean;
  variations?: {
    nodeIds: string[];
    parentNodeId: string;
  }[];
}

interface MoveRow {
  moveNumber: number;
  white: MoveCell | null;
  black: MoveCell | null;
}

const TabularGameTreeView: React.FC<TabularGameTreeViewProps> = ({
  gameTree,
  onMoveSelect,
  onSuggestionHover
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<MoveRow[]>([]);

  // Process the game tree into rows when it changes
  useEffect(() => {
    // Organize moves into rows with white and black columns
    const newRows: MoveRow[] = [];
    let currentRow: MoveRow | null = null;
    
    // Map to track variations by parent node
    const variationsMap = new Map<string, { nodeIds: string[], parentNodeId: string }[]>();
    
    // First, collect all variations
    Object.values(gameTree.moves).forEach(node => {
      if (!node.variations || node.variations.length === 0) return;
      
      // Process each variation for this node
      node.variations.forEach(variation => {
        if (!variation || !variation.moves || variation.moves.length === 0) return;
        
        // Store the variation
        if (!variationsMap.has(node.id)) {
          variationsMap.set(node.id, []);
        }
        
        variationsMap.get(node.id)?.push({
          nodeIds: variation.moves,
          parentNodeId: node.id
        });
      });
    });
    
    // Process the main line
    gameTree.mainLine.forEach((nodeId, index) => {
      const node = gameTree.moves[nodeId];
      if (!node) return;
      
      // For white moves, start a new row
      if (node.color === 'w') {
        currentRow = {
          moveNumber: node.moveNumber,
          white: {
            nodeId: node.id,
            move: node.move,
            comment: node.comment,
            selected: gameTree.currentNode === node.id,
            variations: variationsMap.get(node.id)
          },
          black: null
        };
        newRows.push(currentRow);
      } 
      // For black moves, complete the current row
      else if (node.color === 'b' && currentRow) {
        currentRow.black = {
          nodeId: node.id,
          move: node.move,
          comment: node.comment,
          selected: gameTree.currentNode === node.id,
          variations: variationsMap.get(node.id)
        };
      }
    });
    
    setRows(newRows);
  }, [gameTree]);
  
  // Effect to scroll to the selected move
  useEffect(() => {
    if (gameTree._suppressFocus) {
      return;
    }
    
    if (scrollRef.current && gameTree.currentNode) {
      const element = document.getElementById(`tab-move-${gameTree.currentNode}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [gameTree.currentNode, gameTree._suppressFocus]);
  
  // Fix the getSubVariations function to correctly extract variations
  const getSubVariations = (parentNodeId: string) => {
    // Return an array of variations that have parentNodeId as their parent
    const subVars: { nodeIds: string[], parentNodeId: string }[] = [];
    
    // Check if this node has any variations
    const node = gameTree.moves[parentNodeId];
    if (!node || !node.variations || node.variations.length === 0) {
      return subVars;
    }
    
    // Add all variations for this node
    node.variations.forEach(variation => {
      // Debug what variation structure we actually have
      console.log("Variation in TabularView:", variation);
      
      // Handle both array-of-strings and object-with-moves formats
      const moveIds = Array.isArray(variation) 
        ? variation                 // If variation is already an array of strings
        : (variation.moves || []);  // Or use the moves property if it exists
      
      if (moveIds && moveIds.length > 0) {
        subVars.push({
          nodeIds: moveIds,
          parentNodeId
        });
      }
    });
    
    return subVars;
  };

  // Render a variation
  const renderVariation = (variation: { nodeIds: string[], parentNodeId: string }, level: number = 0) => {
    // If level is too deep or no node IDs, return empty
    if (level > 5 || !variation.nodeIds || variation.nodeIds.length === 0) {
      return null;
    }
    
    // Create elements for this variation
    const elements: JSX.Element[] = [];
    
    // Add opening parenthesis
    elements.push(
      <span key={`open-${variation.parentNodeId}-${level}`} className="text-gray-400">(</span>
    );
    
    // Process all moves in the variation
    let lastShownMoveNumber = 0;
    
    variation.nodeIds.forEach((nodeId, index) => {
      const node = gameTree.moves[nodeId];
      if (!node) return;
      
      // Show move number for the first move or for white moves
      if (index === 0 || (node.color === 'w' && lastShownMoveNumber !== node.moveNumber)) {
        const moveNumber = node.moveNumber || 0;
        lastShownMoveNumber = moveNumber;
        
        // Add move number
        const moveNumberText = index === 0 && node.color === 'b' ? 
          `${moveNumber}...` : 
          `${moveNumber}.`;
          
        elements.push(
          <span key={`num-${nodeId}`} className="text-gray-500 text-xs mr-0.5">
            {moveNumberText}
          </span>
        );
      }
      
      // Add the move
      const isSelected = gameTree.currentNode === nodeId;
      elements.push(
        <span
          key={`move-${nodeId}`}
          id={`move-${nodeId}`}
          className={`
            inline-block px-1 py-0.5 rounded cursor-pointer text-xs font-mono
            ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 text-blue-600'}
            mr-0.5
          `}
          onClick={() => onMoveSelect(nodeId)}
          onMouseEnter={() => onSuggestionHover && onSuggestionHover(node.move)}
          onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)}
        >
          {node.move}
        </span>
      );
      
      // Add comment if exists
      if (node.comment) {
        elements.push(
          <span key={`comment-${nodeId}`} className="text-gray-600 italic text-xs mr-0.5">
            {node.comment}
          </span>
        );
      }
      
      // Process sub-variations for this node recursively
      const subVariations = getSubVariations(nodeId);
      if (subVariations.length > 0) {
        subVariations.forEach((subVar, subIndex) => {
          if (subVar && subVar.nodeIds && subVar.nodeIds.length > 0) {
            const subVarElement = renderVariation({
              nodeIds: subVar.nodeIds,
              parentNodeId: nodeId
            }, level + 1);
            if (subVarElement) {
              elements.push(
                <span key={`subvar-${nodeId}-${subIndex}`} className="mr-0.5">
                  {subVarElement}
                </span>
              );
            }
          }
        });
      }
    });
    
    // Add closing parenthesis
    elements.push(
      <span key={`close-${variation.parentNodeId}-${level}`} className="text-gray-400">)</span>
    );
    
    return <>{elements}</>;
  };
  
  // Render a move cell with proper styling
  const renderMoveCell = (cell: MoveCell | null) => {
    if (!cell) {
      return <td className="p-1.5 border-b border-gray-100"></td>;
    }
    
    const isSelected = cell.nodeId === gameTree.currentNode;
    
    return (
      <td className={`p-1.5 border-b border-gray-100 align-top ${isSelected ? 'bg-blue-50' : ''}`}>
        <div className="flex flex-wrap items-start gap-0.5">
          <span
            id={`move-${cell.nodeId}`}
            className={`
              inline-block px-1 py-0.5 rounded cursor-pointer text-sm font-mono
              ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
            `}
            onClick={() => onMoveSelect(cell.nodeId)}
            onMouseEnter={() => onSuggestionHover && onSuggestionHover(cell.move)}
            onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)}
          >
            {cell.move}
          </span>
          
          {cell.comment && (
            <span className="text-gray-600 italic text-xs">
              {cell.comment}
            </span>
          )}
          
          {/* Render variations inline */}
          {cell.variations && cell.variations.length > 0 && (
            <div className="w-full mt-0.5 text-xs">
              {cell.variations.map((variation, index) => (
                <div 
                  key={`var-${cell.nodeId}-${index}`} 
                  className="ml-2 border-l-2 border-blue-100 pl-1 py-0.5 mb-0.5"
                >
                  {renderVariation(variation, 0)}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
    );
  };
  
  return (
    <div 
      className="tabular-game-tree font-['IBM_Plex_Sans',system-ui,sans-serif] h-full overflow-auto" 
      ref={scrollRef}
    >
      <table className="w-full table-auto border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-1.5 text-left text-xs text-gray-600 w-[10%]">#</th>
            <th className="p-1.5 text-left text-xs text-gray-600 w-[45%]">White</th>
            <th className="p-1.5 text-left text-xs text-gray-600 w-[45%]">Black</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr 
              key={`move-row-${index}`} 
              className="hover:bg-gray-50"
            >
              <td className="p-1.5 text-gray-500 text-xs font-medium border-b border-gray-100">
                {row.moveNumber}.
              </td>
              {renderMoveCell(row.white)}
              {renderMoveCell(row.black)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TabularGameTreeView; 