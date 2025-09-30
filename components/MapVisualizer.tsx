import React, { useMemo, useState } from 'react';
import { MapLayout, Point, Node, StrategicPointType, Team, VisualizationOptions, Edge } from '../types';
import StrategicPointSymbol, { TEAM_COLORS } from './StrategicPointSymbol';

const BlockyLane: React.FC<{ edge: Edge; thickness: number; color: string; opacity: number; }> = React.memo(({ edge, thickness, color, opacity }) => {
    const rects = useMemo(() => {
        const x0 = Math.round(edge.nodes[0].x);
        const y0 = Math.round(edge.nodes[0].y);
        const x1 = Math.round(edge.nodes[1].x);
        const y1 = Math.round(edge.nodes[1].y);
        
        const generatedRects: { x: number; y: number; key: string }[] = [];
        const offset = Math.floor(thickness / 2);

        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        let x = x0;
        let y = y0;

        while (true) {
            generatedRects.push({ x: x - offset, y: y - offset, key: `${x}-${y}` });
            if (x === x1 && y === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y += sy;
            }
        }
        return generatedRects;
    }, [edge, thickness]);

    return (
        <g fill={color} fillOpacity={opacity}>
            {rects.map(r => (
                <rect key={r.key} x={r.x} y={r.y} width={thickness} height={thickness} />
            ))}
        </g>
    );
});


const MapVisualizer: React.FC<{ layout: MapLayout, options: VisualizationOptions }> = ({ layout, options }) => {
    const { width, height, teamGap, laneWidth, teams } = layout;
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    
    const teamLayouts = useMemo(() => Object.values(teams).filter(Boolean), [teams]);
    const numTeams = teamLayouts.length;

    const allNodes = useMemo(() => teamLayouts.flatMap(t => t.nodes), [teamLayouts]);
    const allEdges = useMemo(() => teamLayouts.flatMap(t => t.edges), [teamLayouts]);
    const allGrids = useMemo(() => teamLayouts.flatMap(t => t.grid.flat()), [teamLayouts]);

    const handleNodeClick = (node: Node, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    };

    return (
        <div className="w-full h-full bg-gray-800 rounded-lg shadow-inner overflow-hidden flex items-center justify-center">
            <svg
                viewBox={`-5 -5 ${width + 10} ${height + 10}`}
                className="w-full h-full"
                shapeRendering="crispEdges"
                onClick={() => setSelectedNodeId(null)}
            >
                <rect x={-5} y={-5} width={width+10} height={height+10} fill="#1a202c" />
                
                {/* Center Void Gap */}
                {numTeams === 2 ? (
                    <rect 
                        x={(width - teamGap) / 2} 
                        y={0}
                        width={teamGap}
                        height={height}
                        fill="#111827"
                    />
                ) : (
                    <>
                        <line x1={width/2} y1={0} x2={width/2} y2={height} stroke="#111827" strokeWidth="1" />
                        <line x1={0} y1={height/2} x2={width} y2={height/2} stroke="#111827" strokeWidth="1" />
                        <rect 
                            x={(width - teamGap) / 2} 
                            y={(height - teamGap) / 2}
                            width={teamGap}
                            height={teamGap}
                            fill="#111827"
                        />
                    </>
                )}

                {/* Grid */}
                {options.showGrid && allGrids.map((zone, i) => (
                    <rect
                        key={`grid-${i}`}
                        x={zone.x}
                        y={zone.y}
                        width={zone.width}
                        height={zone.height}
                        fill="none"
                        stroke={TEAM_COLORS.BLUE}
                        strokeWidth="0.2"
                        strokeOpacity="0.2"
                    />
                ))}

                {/* Grid Cell Names */}
                {options.showGridCellNames && allGrids.map((zone, i) => {
                    if (zone.row < 0 || zone.col < 0 || zone.row > 2 || zone.col > 2) return null;
                    const rowNames = ['Top', 'Mid', 'Bottom'];
                    const colNames = ['Rear', 'Mid', 'Front'];
                    const cellName = `${rowNames[zone.row]}-${colNames[zone.col]}`;

                    return (
                        <text
                            key={`grid-name-${i}`}
                            x={zone.x + zone.width / 2}
                            y={zone.y + zone.height / 2}
                            fill="#4a5568"
                            fontSize="5"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                            fontWeight="bold"
                        >
                            {cellName}
                        </text>
                    );
                })}


                {/* Lanes */}
                {options.showLanes && allEdges.filter(edge => edge.type !== 'bridgeable').map((edge, i) => {
                    const fromNode = allNodes.find(p => p.id === edge.from);
                    const team = fromNode?.team;
                    const color = team ? TEAM_COLORS[team] : '#9e9e9e';
                    const opacity = 0.6;
                    return <BlockyLane key={`lane-${i}`} edge={edge} thickness={laneWidth} color={color} opacity={opacity} />;
                })}


                {/* Paths */}
                {options.showPaths && allEdges.map((edge, i) => {
                    if (!edge.nodes || edge.nodes.length < 2) return null;
                    const point = edge.nodes[0];
                    const point2 = edge.nodes[1];
                    return (
                        <line
                            key={`path-${i}`}
                            x1={point.x} y1={point.y}
                            x2={point2.x} y2={point2.y}
                            stroke="white"
                            strokeWidth="0.25"
                            strokeDasharray={edge.type === 'bridgeable' ? "2 2" : "none"}
                            strokeOpacity="0.5"
                        />
                    );
                })}

                {/* Path Lengths */}
                {options.showPathLengths && allEdges.map((edge, i) => {
                    if (!edge.nodes || edge.nodes.length < 2) return null;
                    const p1 = edge.nodes[0];
                    const p2 = edge.nodes[1];
                    const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;

                    return (
                        <text
                            key={`path-len-${i}`}
                            x={midX}
                            y={midY}
                            fill="#a0aec0"
                            fontSize="3"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            stroke="#1a202c"
                            strokeWidth="0.5"
                            paintOrder="stroke"
                        >
                            {Math.round(length)}
                        </text>
                    );
                })}

                {/* Points */}
                {options.showPoints && allNodes.map(node => 
                    <StrategicPointSymbol
                        key={node.id}
                        node={node}
                        onClick={handleNodeClick}
                        showLabel={selectedNodeId === node.id}
                    />
                )}
            </svg>
        </div>
    );
};

export default MapVisualizer;