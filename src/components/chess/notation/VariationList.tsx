// Component to display variations in a compact format
const VariationList: React.FC<{
  gameTree: GameTree;
  currentNode: GameTreeNode;
  onNodeSelect: (node: GameTreeNode) => void;
  onSuggestionHover?: (move: string | null) => void;
}> = ({ gameTree, currentNode, onNodeSelect, onSuggestionHover }) => {
  // Render the main line and variations
  const renderNode = (node: GameTreeNode, depth: number = 0, isMainLine: boolean = true) => {
    const isSelected = node === currentNode;
    const moveNumber = getMoveNumber(node);
    const isWhiteMove = isWhiteToMove(node);
    
    return (
      <React.Fragment key={node.fen}>
        {/* Show move number when needed */}
        {(isWhiteMove || depth > 0) && (
          <span className="text-gray-500 font-medium">
            {moveNumber}{isWhiteMove ? '.' : '...'}
          </span>
        )}
        
        {/* The move itself */}
        <span 
          className={`cursor-pointer px-1 py-0.5 rounded ${
            isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'
          }`}
          onClick={() => onNodeSelect(node)}
          onMouseEnter={() => onSuggestionHover && onSuggestionHover(node.move)}
          onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)}
        >
          {node.move}
        </span>
        
        {/* Variations */}
        {node.variations.length > 1 && (
          <span className="text-gray-400 mx-1">(</span>
        )}
        
        {node.variations.slice(1).map((variation, i) => (
          <React.Fragment key={variation.fen}>
            {i > 0 && <span className="text-gray-400 mx-1">|</span>}
            {renderNode(variation, depth + 1, false)}
          </React.Fragment>
        ))}
        
        {node.variations.length > 1 && (
          <span className="text-gray-400 mx-1">)</span>
        )}
        
        {/* Continue with main line */}
        {node.variations.length > 0 && isMainLine && (
          <React.Fragment>
            <span className="mx-1"></span>
            {renderNode(node.variations[0], depth, true)}
          </React.Fragment>
        )}
      </React.Fragment>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 overflow-y-auto">
      <div className="flex flex-wrap">
        {renderNode(gameTree.rootNode)}
      </div>
    </div>
  );
}; 