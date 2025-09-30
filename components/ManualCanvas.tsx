import React, { useRef, useState } from 'react';
import { Node, Edge, Point, Team, MapScope, TeamMirrorAxis, EditorTool, VisualizationOptions, BackgroundImage } from '../types';
import StrategicPointSymbol from './StrategicPointSymbol';

interface ManualCanvasProps {
    allNodes: Node[];
    allEdges: Edge[];
    backgroundImage: BackgroundImage | null;
    canvasSize: { width: number; height: number };

    mapScope: MapScope;
    teamMirror: TeamMirrorAxis;
    
    activeTool: EditorTool;
    connectionStartNode: Node | null;
    onCanvasClick: (point: Point) => void;
    onNodeClick: (node: Node) => void;
    onEdgeClick: (edge: Edge, event: React.MouseEvent) => void;
    options: VisualizationOptions;
    selectedEdgeKeys: Set<string>;
    highlightedEdgeKeys: Set<string>;
    makeEdgeKey: (from: string, to: string) => string;
}

const ManualCanvas: React.FC<ManualCanvasProps> = (props) => {
    const { 
        allNodes, allEdges, backgroundImage, canvasSize, mapScope, teamMirror, 
        activeTool, connectionStartNode, onCanvasClick, onNodeClick, onEdgeClick,
        options, selectedEdgeKeys, highlightedEdgeKeys, makeEdgeKey,
    } = props;

    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [hoveredEdgeKey, setHoveredEdgeKey] = useState<string | null>(null);

    const getSVGPoint = (e: React.MouseEvent<SVGSVGElement>): Point => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
        return { x: svgP.x, y: svgP.y };
    };

    const handleBackgroundClick = (e: React.MouseEvent<SVGSVGElement>) => {
        setSelectedNodeId(null);
        onCanvasClick(getSVGPoint(e));
    };
    
    const handleNodeSymbolClick = (node: Node, e: React.MouseEvent) => {
         e.stopPropagation(); // Prevent background click from firing
         setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
         onNodeClick(node);
    };
    
    const PADDING = 5;

    const getEdgeVisualState = (edge: Edge) => {
        const sourceFromId = edge.from.replace(/-mirrored$/, '').replace(Team.ORANGE, Team.BLUE);
        const sourceToId = edge.to.replace(/-mirrored$/, '').replace(Team.ORANGE, Team.BLUE);
        const edgeKey = makeEdgeKey(sourceFromId, sourceToId);

        const isSelected = selectedEdgeKeys.has(edgeKey);
        const isHighlighted = highlightedEdgeKeys.has(edgeKey);
        const isHovered = (activeTool === 'delete' || activeTool === 'select') && hoveredEdgeKey === edgeKey;

        if (isSelected) return { stroke: '#facc15', strokeWidth: 1.5 }; // yellow-400
        if (isHovered) return { stroke: '#22d3ee', strokeWidth: 1.5 }; // cyan-400
        if (isHighlighted) return { stroke: '#60a5fa', strokeWidth: 1.25 }; // blue-400
        
        const isOrangeEdge = edge.from.startsWith(Team.ORANGE) && edge.to.startsWith(Team.ORANGE);
        return { stroke: 'white', strokeWidth: 0.5, strokeOpacity: isOrangeEdge ? 0.3 : 0.7 };
    };

    return (
        <div className="w-full h-full bg-gray-800 rounded-lg shadow-inner overflow-hidden flex items-center justify-center relative">
            <svg
                ref={svgRef}
                viewBox={`${-PADDING} ${-PADDING} ${canvasSize.width + PADDING * 2} ${canvasSize.height + PADDING * 2}`}
                className="w-full h-full"
                shapeRendering="crispEdges"
                onClick={handleBackgroundClick}
                style={{ cursor: activeTool === 'add' ? 'crosshair' : 'default' }}
            >
                <rect x={-PADDING} y={-PADDING} width={canvasSize.width + PADDING * 2} height={canvasSize.height + PADDING * 2} fill="#1a202c" />
                {backgroundImage && (
                    <image 
                        href={backgroundImage.src} 
                        x={0} 
                        y={0} 
                        width={backgroundImage.width} 
                        height={backgroundImage.height} 
                        opacity={backgroundImage.opacity}
                        transform={`translate(${backgroundImage.x + canvasSize.width / 2}, ${backgroundImage.y + canvasSize.height / 2}) scale(${backgroundImage.scale}) translate(${-backgroundImage.width / 2}, ${-backgroundImage.height / 2})`}
                    />
                )}


                 {mapScope === 'half' && 
                    <g style={{pointerEvents: 'none'}}>
                        <line 
                            x1={canvasSize.width/2} y1="0" 
                            x2={canvasSize.width/2} y2={canvasSize.height} 
                            stroke="rgba(255,255,255,0.2)" 
                            strokeWidth="1" 
                            strokeDasharray="5 5"
                        />
                         {teamMirror === TeamMirrorAxis.HORIZONTAL &&
                            <line
                                x1="0" y1={canvasSize.height / 2}
                                x2={canvasSize.width / 2} y2={canvasSize.height / 2}
                                stroke="rgba(150, 200, 255, 0.3)"
                                strokeWidth="0.5"
                                strokeDasharray="3 3"
                            />
                        }
                    </g>
                 }

                {/* Edges */}
                {allEdges.map((edge, i) => {
                    if (!edge.nodes || edge.nodes.length < 2) return null;
                    const fromNode = edge.nodes[0];
                    const toNode = edge.nodes[1];
                    const visualState = getEdgeVisualState(edge);
                    
                    return (
                         <g
                            key={`path-group-${i}-${edge.from}-${edge.to}`}
                            onClick={(e) => { e.stopPropagation(); onEdgeClick(edge, e); }}
                            onMouseEnter={() => {
                                const edgeKey = makeEdgeKey(edge.from, edge.to);
                                setHoveredEdgeKey(edgeKey);
                            }}
                            onMouseLeave={() => setHoveredEdgeKey(null)}
                            style={{ cursor: (activeTool === 'delete' || activeTool === 'select') ? 'pointer' : 'default' }}
                        >
                            <line x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y} stroke="transparent" strokeWidth="8" />
                            <line
                                x1={fromNode.x} y1={fromNode.y}
                                x2={toNode.x} y2={toNode.y}
                                strokeDasharray={edge.type === 'bridgeable' ? '3 3' : 'none'}
                                style={{ pointerEvents: 'none', ...visualState }}
                            />
                        </g>
                    );
                })}

                {/* Edge Lengths */}
                {options.showPathLengths && allEdges.map((edge, i) => {
                    if (!edge.nodes || edge.nodes.length < 2) return null;
                    const p1 = edge.nodes[0];
                    const p2 = edge.nodes[1];
                    const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;

                    return (
                        <text
                            key={`path-len-${i}-${edge.from}-${edge.to}`}
                            x={midX}
                            y={midY}
                            fill="#a0aec0"
                            fontSize="4"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            stroke="#1a202c"
                            strokeWidth="0.6"
                            paintOrder="stroke"
                            style={{ pointerEvents: 'none' }}
                        >
                            {Math.round(length)}
                        </text>
                    );
                })}

                {/* Nodes */}
                {allNodes.map(node => {
                     const isDerived = mapScope === 'half' && (node.id.includes('-mirrored') || node.team === Team.ORANGE);
                     const canInteract = activeTool === 'delete' || activeTool === 'connect';
                     return (
                        <g style={{ cursor: canInteract ? 'pointer' : 'default' }} key={node.id}>
                            <StrategicPointSymbol 
                                node={node} 
                                onClick={handleNodeSymbolClick}
                                isSelected={connectionStartNode?.id === node.id}
                                opacity={isDerived ? 0.5 : 1.0}
                                showLabel={selectedNodeId === node.id}
                            />
                        </g>
                    )
                })}
            </svg>
        </div>
    );
};

export default ManualCanvas;