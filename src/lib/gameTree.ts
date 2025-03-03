'use client';

import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';
import { ChessMove, ChessMoveNode, ChessGameTree, PlayerInfo } from './types';

// Create a game tree data structure for chess variations
// interface GameTreeNode {
//   move: string;
//   fen: string;
//   comment?: string;
//   nags?: number[];
//   variations: GameTreeNode[];
//   parentNode?: GameTreeNode;
//   isMainLine?: boolean;
//   moveNumber?: number;
//   color?: 'w' | 'b';
// }

// interface GameTree {
//   rootNode: GameTreeNode;
//   currentNode: GameTreeNode;
//   playerInfo: PlayerInfo;
// }

// Convert from linear moves to game tree
export function convertMovesToGameTree(moves: ChessMove[], playerInfo?: PlayerInfo): ChessGameTree {
  const chess = new Chess();
  const gameTree: ChessGameTree = {
    id: uuidv4(),
    rootPosition: chess.fen(),
    currentNode: '',
    moves: {},
    mainLine: []
  };
  
  // If no moves, return empty tree
  if (!moves || moves.length === 0) {
    return gameTree;
  }
  
  let lastNodeId = '';
  let moveNumber = 1;
  
  // Process each move and build the tree
  for (let i = 0; i < moves.length; i++) {
    const moveObj = moves[i];
    
    // Process white move
    if (moveObj.white) {
      try {
        const result = chess.move(moveObj.white);
        if (result) {
          const nodeId = uuidv4();
          
          // Create the node
          const node: ChessMoveNode = {
            id: nodeId,
            move: moveObj.white,
            fen: chess.fen(),
            moveNumber: moveObj.moveNumber,
            color: 'w',
            isMainLine: true,
            parentId: lastNodeId || null,
            variations: []
          };
          
          // Add to game tree
          gameTree.moves[nodeId] = node;
          gameTree.mainLine.push(nodeId);
          lastNodeId = nodeId;
        }
      } catch (e) {
        console.error(`Invalid white move: ${moveObj.white}`);
      }
    }
    
    // Process black move
    if (moveObj.black) {
      try {
        const result = chess.move(moveObj.black);
        if (result) {
          const nodeId = uuidv4();
          
          // Create the node
          const node: ChessMoveNode = {
            id: nodeId,
            move: moveObj.black,
            fen: chess.fen(),
            moveNumber: moveObj.moveNumber,
            color: 'b',
            isMainLine: true,
            parentId: lastNodeId || null,
            variations: []
          };
          
          // Add to game tree
          gameTree.moves[nodeId] = node;
          gameTree.mainLine.push(nodeId);
          lastNodeId = nodeId;
        }
      } catch (e) {
        console.error(`Invalid black move: ${moveObj.black}`);
      }
    }
  }
  
  // Set current node to the last move
  if (gameTree.mainLine.length > 0) {
    gameTree.currentNode = gameTree.mainLine[gameTree.mainLine.length - 1];
  }
  
  return gameTree;
}

// Convert from game tree back to linear moves for compatibility
export function convertGameTreeToMoves(gameTree: ChessGameTree): ChessMove[] {
  const moves: ChessMove[] = [];
  
  // Check if gameTree is valid
  if (!gameTree) {
    console.error("Invalid game tree passed to convertGameTreeToMoves");
    return moves;
  }
  
  // If there's no main line, return empty array
  if (!gameTree.mainLine || gameTree.mainLine.length === 0 || !gameTree.moves) {
    return moves;
  }
  
  let currentMoveNumber = 1;
  let currentMove: ChessMove = { moveNumber: currentMoveNumber, white: '', black: '' };
  
  // Process each move in the main line
  for (const nodeId of gameTree.mainLine) {
    const node = gameTree.moves[nodeId];
    if (!node) continue;
    
    // Determine if this is a white or black move
    if (node.color === 'w') {
      // Start a new move pair
      if (currentMove.white) {
        // If we already have a white move, start a new move
        moves.push(currentMove);
        currentMoveNumber++;
        currentMove = { moveNumber: currentMoveNumber, white: node.move, black: '' };
      } else {
        // First white move or continuing
        currentMove.moveNumber = node.moveNumber || currentMoveNumber;
        currentMove.white = node.move;
      }
    } else {
      // Black move - complete the current move pair
      currentMove.black = node.move;
      moves.push(currentMove);
      currentMoveNumber++;
      currentMove = { moveNumber: currentMoveNumber, white: '', black: '' };
    }
  }
  
  // Add the last move if it only has white
  if (currentMove.white && !currentMove.black) {
    moves.push(currentMove);
  }
  
  return moves;
}

// Create a new variation from a given position
export function createVariation(
  gameTree: ChessGameTree,
  parentId: string,
  move: string
): ChessGameTree {
  // Clone the tree to avoid mutations
  const updatedMoves = { ...gameTree.moves };
  
  // Get the parent node
  const parentNode = updatedMoves[parentId];
  if (!parentNode) {
    console.error("Parent node not found:", parentId);
    return gameTree;
  }
  
  // Create a chess instance with the parent position
  const chess = new Chess();
  chess.load(parentNode.fen);
  
  // Try to make the move
  const chessMove = chess.move(move);
  if (!chessMove) {
    console.error("Invalid move for variation:", move);
    return gameTree;
  }
  
  // Generate a new ID for this move
  const newNodeId = uuidv4();
  
  // Create the new variation node
  const newNode: ChessMoveNode = {
    id: newNodeId,
    moveNumber: chess.moveNumber(),
    move: chessMove.san,
    color: chessMove.color,
    fen: chess.fen(),
    isMainLine: false,
    parentId: parentId,
    variations: []
  };
  
  // Add the new node to the moves object
  updatedMoves[newNodeId] = newNode;
  
  // Add this new move as a variation of the parent
  const updatedParentNode = {
    ...parentNode,
    variations: [
      ...(parentNode.variations || []),
      [newNodeId] // Add as a simple array of IDs for consistency
    ]
  };
  
  // Update the parent node in the moves object
  updatedMoves[parentId] = updatedParentNode;
  
  console.log(`Created variation ${move} (${newNodeId}) for parent ${parentId}`);
  console.log("Updated parent variations:", updatedParentNode.variations);
  
  // Return the updated game tree
  return {
    ...gameTree,
    moves: updatedMoves,
    currentNode: newNodeId
  };
}

// Promote a variation to become the main line
export function promoteVariation(
  gameTree: ChessGameTree,
  variationPath: number[]
): ChessGameTree {
  // Clone the tree to avoid mutations
  const updatedTree: ChessGameTree = {
    ...gameTree,
    moves: { ...gameTree.moves },
    mainLine: [...gameTree.mainLine]
  };
  
  // TODO: Implement variation promotion
  // This is complex and involves rearranging the main line
  
  return updatedTree;
}

// Delete a variation
export function deleteVariation(
  gameTree: ChessGameTree,
  variationPath: number[]
): ChessGameTree {
  // Clone the tree to avoid mutations
  const updatedTree: ChessGameTree = {
    ...gameTree,
    moves: { ...gameTree.moves },
    mainLine: [...gameTree.mainLine]
  };
  
  // TODO: Implement variation deletion
  
  return updatedTree;
}

// Add comment to a move
export function addComment(
  gameTree: ChessGameTree,
  nodeId: string,
  comment: string
): ChessGameTree {
  // Clone the tree to avoid mutations
  const updatedTree: ChessGameTree = {
    ...gameTree,
    moves: { ...gameTree.moves }
  };
  
  if (updatedTree.moves[nodeId]) {
    updatedTree.moves[nodeId] = {
      ...updatedTree.moves[nodeId],
      comment
    };
  }
  
  return updatedTree;
}

// Fix the playMove function to correctly handle variations
export function playMove(gameTree: ChessGameTree, move: string): ChessGameTree {
  const chess = new Chess();
  
  if (gameTree.currentNode) {
    // We're at a node, need to determine if it's the last in its line
    const currentNode = gameTree.moves[gameTree.currentNode];
    
    // Load the position from this node
    chess.load(currentNode.fen);
    
    // Try to make the move
    const chessMove = chess.move(move);
    if (!chessMove) {
      console.error("Invalid move:", move);
      return gameTree;
    }
    
    // Generate a new ID for this move
    const newNodeId = uuidv4();
    
    // Create the new node
    const newNode: ChessMoveNode = {
      id: newNodeId,
      moveNumber: chess.moveNumber(),
      move: chessMove.san,
      color: chessMove.color,
      fen: chess.fen(),
      isMainLine: false,  // We'll determine this later
      parentId: gameTree.currentNode,
      variations: []
    };
    
    // Check if this node is the last in the main line
    const isLastInMainLine = 
      gameTree.mainLine.length > 0 && 
      gameTree.mainLine[gameTree.mainLine.length - 1] === gameTree.currentNode;
    
    // Check if we're at the end of a variation
    let isLastInVariation = false;
    let variationPath: string[] = [];
    
    if (!isLastInMainLine) {
      // Check if we're in a variation and at its end
      variationPath = findVariationPath(gameTree, gameTree.currentNode);
      isLastInVariation = variationPath.length > 0 && 
        variationPath[variationPath.length - 1] === gameTree.currentNode;
    }
    
    // Check if this move already exists in one of the variations
    const parentNode = gameTree.moves[gameTree.currentNode];
    let existingVariationNode = null;
    
    if (parentNode.variations && parentNode.variations.length > 0) {
      // Look for a variation that starts with this move
      for (const variation of parentNode.variations) {
        if (!variation || variation.length === 0) continue;
        
        let firstMoveId: string | undefined;
        
        if (Array.isArray(variation)) {
          firstMoveId = variation[0];
        } else if (variation.moves && variation.moves.length > 0) {
          firstMoveId = variation.moves[0];
        }
        
        if (firstMoveId) {
          const firstMove = gameTree.moves[firstMoveId];
          if (firstMove && firstMove.move === move) {
            existingVariationNode = firstMoveId;
            break;
          }
        }
      }
      
      if (existingVariationNode) {
        console.log("Variation already exists, navigating to it:", move);
        return {
          ...gameTree,
          currentNode: existingVariationNode
        };
      }
    }
    
    // Update the moves object with the new node
    const updatedMoves = {
      ...gameTree.moves,
      [newNodeId]: newNode
    };
    
    // Decide where to add this move based on our position
    if (isLastInMainLine) {
      // If this move is from the last move in the main line, add it to the main line
      console.log("Adding move to end of main line:", move);
      newNode.isMainLine = true;
      
      return {
        ...gameTree,
        moves: updatedMoves,
        mainLine: [...gameTree.mainLine, newNodeId],
        currentNode: newNodeId
      };
    } else if (isLastInVariation) {
      // We're at the end of a variation, append to it
      console.log("Appending move to end of variation:", move);
      
      // Find the parent variation in the tree
      const parentId = variationPath[variationPath.length - 2]; // Get the variation parent
      const parentNode = gameTree.moves[parentId];
      
      if (!parentNode) {
        console.error("Could not find parent node for variation");
        return gameTree;
      }
      
      // Find the variation array that contains our current node
      const variationIndex = parentNode.variations.findIndex(v => {
        if (Array.isArray(v)) {
          return v.includes(gameTree.currentNode);
        } else if (v.moves) {
          return v.moves.includes(gameTree.currentNode);
        }
        return false;
      });
      
      if (variationIndex === -1) {
        console.error("Could not find variation for current node");
        return gameTree;
      }
      
      // Get the variation
      const variation = parentNode.variations[variationIndex];
      let updatedVariation;
      
      if (Array.isArray(variation)) {
        updatedVariation = [...variation, newNodeId];
      } else if (variation.moves) {
        updatedVariation = { ...variation, moves: [...variation.moves, newNodeId] };
      } else {
        console.error("Unknown variation format");
        return gameTree;
      }
      
      // Update the parent node's variations
      const updatedVariations = [...parentNode.variations];
      updatedVariations[variationIndex] = updatedVariation;
      
      const updatedParentNode = {
        ...parentNode,
        variations: updatedVariations
      };
      
      updatedMoves[parentId] = updatedParentNode;
      
      return {
        ...gameTree,
        moves: updatedMoves,
        currentNode: newNodeId
      };
    } else {
      // Create a new variation - we're in the middle of a line
      console.log("Creating new variation from middle of line:", move);
      
      // Create a proper variation format that all components can read
      const updatedParentNode = {
        ...parentNode,
        variations: [
          ...(parentNode.variations || []), 
          [newNodeId] // Variations are ALWAYS arrays of move IDs
        ]
      };
      
      updatedMoves[gameTree.currentNode] = updatedParentNode;
      
      return {
        ...gameTree,
        moves: updatedMoves,
        currentNode: newNodeId
      };
    }
  } else {
    // We're at the root position, add the first move
    chess.load(gameTree.rootPosition);
    
    // Try to make the move
    const chessMove = chess.move(move);
    if (!chessMove) {
      console.error("Invalid move:", move);
      return gameTree;
    }
    
    // Generate a new ID for this move
    const newNodeId = uuidv4();
    
    // Create the new node
    const newNode: ChessMoveNode = {
      id: newNodeId,
      moveNumber: chess.moveNumber(),
      move: chessMove.san,
      color: chessMove.color,
      fen: chess.fen(),
      isMainLine: true,
      parentId: null,
      variations: []
    };
    
    // Add this node to the moves and main line
    return {
      ...gameTree,
      moves: {
        ...gameTree.moves,
        [newNodeId]: newNode
      },
      mainLine: [newNodeId],
      currentNode: newNodeId
    };
  }
}

// Helper function to find the path to a node in variations
function findVariationPath(gameTree: ChessGameTree, nodeId: string): string[] {
  // If the node is in the main line, it's not in a variation
  if (gameTree.mainLine.includes(nodeId)) {
    return [];
  }
  
  // DFS to find the path to this node
  const path: string[] = [];
  
  function dfs(currentId: string): boolean {
    path.push(currentId);
    
    if (currentId === nodeId) {
      return true;
    }
    
    const node = gameTree.moves[currentId];
    if (!node) {
      path.pop();
      return false;
    }
    
    // Check children in the main line first
    const mainLineIndex = gameTree.mainLine.indexOf(currentId);
    if (mainLineIndex >= 0 && mainLineIndex < gameTree.mainLine.length - 1) {
      const nextId = gameTree.mainLine[mainLineIndex + 1];
      if (dfs(nextId)) {
        return true;
      }
    }
    
    // Check variations
    if (node.variations) {
      for (const variation of node.variations) {
        if (!variation) continue;
        
        const variationNodes = Array.isArray(variation) ? 
          variation : (variation.moves || []);
        
        for (const varNodeId of variationNodes) {
          if (dfs(varNodeId)) {
            return true;
          }
        }
      }
    }
    
    path.pop();
    return false;
  }
  
  // Start with nodes in the main line
  for (const mainNodeId of gameTree.mainLine) {
    path.length = 0; // Clear the path
    if (dfs(mainNodeId)) {
      return path;
    }
  }
  
  return [];
}

const handlePositionChange = (newPosition: string) => {
  // Implementation goes here or remove this function
  console.log("Position changed:", newPosition);
  return false;
};

// Either implement these functions or remove their references
function getCurrentNode() {
  // Placeholder implementation
  return { variations: [] };
}

function extendLine(node: any, newPosition: string) {
  // Placeholder implementation
  console.log("Extending line with position:", newPosition);
  return false;
}

function findMatchingVariation(node: any, newPosition: string) {
  // Placeholder implementation
  console.log("Finding matching variation for position:", newPosition);
  return null;
}

function navigateToVariation(variation: any) {
  // Placeholder implementation
  console.log("Navigating to variation:", variation);
  return false;
}

function createNewVariation(node: any, newPosition: string) {
  // Placeholder implementation
  console.log("Creating new variation for position:", newPosition);
  return false;
}