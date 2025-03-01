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
  parentNodeId: string,
  move: string
): ChessGameTree {
  // Clone the tree to avoid mutations
  const updatedTree: ChessGameTree = {
    ...gameTree,
    moves: { ...gameTree.moves },
    mainLine: [...gameTree.mainLine]
  };
  
  const parentNode = updatedTree.moves[parentNodeId];
  if (!parentNode) {
    console.error("Failed to create variation: Parent node not found:", parentNodeId);
    return gameTree; // No change if parent not found
  }
  
  // Check if this variation already exists
  for (const variation of parentNode.variations) {
    if (variation.length > 0) {
      const firstMove = variation[0];
      if (firstMove.move === move) {
        console.log("Variation already exists, navigating to it:", move);
        // This variation already exists, just navigate to it
        return {
          ...gameTree,
          currentNode: firstMove.id
        };
      }
    }
  }
  
  // Create a chess instance from the parent position
  const chess = new Chess(parentNode.fen);
  
  try {
    console.log("Attempting to create variation with move:", move, "from position:", parentNode.fen);
    // Try to make the move
    const result = chess.move(move);
    
    if (!result) {
      console.warn("Invalid move when creating variation:", move);
      return gameTree; // No change if move is invalid
    }
    
    console.log("Successfully made move:", move, "resulting in position:", chess.fen());
    
    // Create the new variation node
    const newNodeId = uuidv4();
    const newNode: ChessMoveNode = {
      id: newNodeId,
      moveNumber: parentNode.moveNumber + (parentNode.color === 'w' ? 0 : 1),
      move: result.san, // Use validated SAN notation
      color: parentNode.color === 'w' ? 'b' : 'w',
      fen: chess.fen(),
      isMainLine: false,
      parentId: parentNodeId,
      variations: []
    };
    
    // Create a separate deep copy of the node for the variations array
    // This is important to prevent reference sharing issues
    const newNodeForVariation: ChessMoveNode = {
      ...newNode,
      variations: [] // Empty variations array
    };
    
    // Add the node to the tree
    updatedTree.moves[newNodeId] = newNode;
    
    // Create a new variations array with the new variation added
    // Using a proper deep copy to avoid reference issues
    const newVariations = parentNode.variations.map(v => 
      v.map(n => ({...n}))
    );
    
    // Add the new variation
    newVariations.push([newNodeForVariation]);
    
    // Add the variation to the parent with a completely new reference
    const updatedParent = {
      ...parentNode,
      variations: newVariations
    };
    
    // Update the parent node in the tree
    updatedTree.moves[parentNodeId] = updatedParent;
    
    // Set as current node
    updatedTree.currentNode = newNodeId;
    
    console.log("Created variation node:", newNode);
    console.log("Parent variations count:", updatedParent.variations.length);
    
    return updatedTree;
  } catch (e) {
    // Invalid move
    console.error("Error creating variation:", e);
    return gameTree;
  }
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

// Complete the playMove function to handle all cases
export function playMove(
  gameTree: ChessGameTree,
  fromNodeId: string,
  move: string
): ChessGameTree {
  console.log(`1. Playing move "${move}" from node "${fromNodeId}"`);
  
  const node = gameTree.moves[fromNodeId];
  if (!node) {
    console.error("Node not found:", fromNodeId);
    return gameTree;
  }
  
  const chess = new Chess(node.fen);
  const result = chess.move(move);
  if (!result) {
    console.error("Invalid move:", move);
    return gameTree;
  }
  
  const newNodeId = uuidv4();
  const newNode: ChessMoveNode = {
    id: newNodeId,
    move: move,
    fen: chess.fen(),
    moveNumber: node.moveNumber + (node.color === 'w' ? 0 : 1),
    color: node.color === 'w' ? 'b' : 'w',
    isMainLine: true,
    parentId: fromNodeId,
    variations: []
  };
  
  console.log(`2. New node created:`, newNode);
  
  const updatedMoves = {
    ...gameTree.moves,
    [newNodeId]: newNode,
  };

  // Check if we're at the end of the main line
  const isLastNodeInMainLine = gameTree.mainLine[gameTree.mainLine.length - 1] === fromNodeId;
  
  // Check if the node is part of any variation and if it's the last node in that variation
  let isLastNodeInVariation = false;
  let variationInfo = null;
  
  // Check if the node is in the middle of the main line
  const mainLineIndex = gameTree.mainLine.indexOf(fromNodeId);
  const isInMiddleOfMainLine = mainLineIndex >= 0 && mainLineIndex < gameTree.mainLine.length - 1;
  
  // Find if the node is part of any variation and its position
  let isInVariation = false;
  let isInMiddleOfVariation = false;
  let variationPath = null;
  
  // Traverse all nodes with variations to find where our node is
  Object.values(gameTree.moves).forEach(parentNode => {
    if (parentNode.variations && parentNode.variations.length > 0) {
      parentNode.variations.forEach((variation, varIndex) => {
        if (variation.moves && variation.moves.length > 0) {
          // Check if this node is in this variation
          const nodeIndex = variation.moves.indexOf(fromNodeId);
          if (nodeIndex >= 0) {
            isInVariation = true;
            
            // Check if it's the last node in the variation
            if (nodeIndex === variation.moves.length - 1) {
              isLastNodeInVariation = true;
              variationInfo = { parentId: parentNode.id, variationIndex: varIndex };
            } else {
              // It's in the middle of a variation
              isInMiddleOfVariation = true;
              variationPath = { 
                parentId: parentNode.id, 
                variationIndex: varIndex, 
                nodeIndex: nodeIndex 
              };
            }
          }
        }
      });
    }
  });
  
  // Case 1: Node is at the end of the main line - extend the main line
  if (isLastNodeInMainLine) {
    console.log(`3. Extending main line with new node ID: ${newNodeId}`);
    return {
      ...gameTree,
      moves: updatedMoves,
      mainLine: [...gameTree.mainLine, newNodeId],
      currentNode: newNodeId
    };
  }
  // Case 2: Node is at the end of a variation - extend that variation
  else if (isLastNodeInVariation && variationInfo) {
    console.log(`4. Extending variation at path:`, variationInfo);
    
    const parentNode = gameTree.moves[variationInfo.parentId];
    const updatedVariations = [...parentNode.variations];
    updatedVariations[variationInfo.variationIndex].moves.push(newNodeId);
    
    updatedMoves[variationInfo.parentId] = {
      ...parentNode,
      variations: updatedVariations
    };
    
    return {
      ...gameTree,
      moves: updatedMoves,
      currentNode: newNodeId
    };
  }
  // Case 3: Node is in the middle of EITHER the main line OR a variation - create a new branch
  else {
    console.log(`5. Creating a new variation from node ID: ${fromNodeId} (in ${isInMiddleOfVariation ? 'variation' : 'main line'})`);
    
    // Create a new variation starting from the clicked node
    const updatedNode = {
      ...node,
      variations: [
        ...node.variations,
        {
          id: uuidv4(),
          moves: [newNodeId]
        }
      ]
    };
    
    updatedMoves[fromNodeId] = updatedNode;
    
    return {
      ...gameTree,
      moves: updatedMoves,
      currentNode: newNodeId
    };
  }
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