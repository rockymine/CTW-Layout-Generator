import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { MapLayout, SymmetryMode, GridMode, Point, GeneratorConfig, VisualizationOptions, Node, Edge, StrategicPointType, Team, EditorTool, MapScope, TeamMirrorAxis, BackgroundImage, Route, EdgeType, NODE_TYPE_ABBREVIATIONS } from './types';
import { generateLayout } from './lib/mapGenerator';
import Controls from './components/Controls';
import ManualControls from './components/ManualControls';
import MapVisualizer from './components/MapVisualizer';
import ManualCanvas from './components/ManualCanvas';
import CoordinateDisplay from './components/CoordinateDisplay';
import Documentation from './components/Documentation';

const initialConfig: GeneratorConfig = {
    teamWidth: 90,
    teamHeight: 160,
    teamGap: 24,
    laneWidth: 4,
    seed: Date.now(),
    gridMode: GridMode.STANDARD,
    symmetryMode: SymmetryMode.ROTATION,
    symmetricalTeamLayout: false,
    spawnEntryDistance: { min: 10, max: 25 },
    woolEntryDistance: { min: 10, max: 25 },
    frontlineEntryDistance: { min: 10, max: 25 },
    islandGeneration: {
        enabled: true,
        maxIslandsPerTeam: 2,
        spawnInFourthColumn: true,
        spawnInCenterGap: true,
        spawnInEmptyZones: true,
    },
    pathingEnhancements: {
        enableWoolFlankRoutes: true,
        enableSpawnWoolRushRoute: false,
    },
    numTeams: 2,
    woolsPerTeam: 2,
};

const initialVizOptions: VisualizationOptions = {
    showGrid: true,
    showPoints: true,
    showPaths: true,
    showLanes: true,
    showCoordinates: false,
    showPathLengths: false,
    showGridCellNames: false,
};

type InfoPanelTab = 'documentation' | 'coordinates';
type AppMode = 'generator' | 'manual';

// Edge keys uniquely identify an edge regardless of from/to order
const makeEdgeKey = (from: string, to: string) => [from, to].sort().join('--');

const App: React.FC = () => {
    // App mode
    const [mode, setMode] = useState<AppMode>('generator');

    // Generator state
    const [config, setConfig] = useState<GeneratorConfig>(initialConfig);
    const [layout, setLayout] = useState<MapLayout | null>(null);
    const [vizOptions, setVizOptions] = useState<VisualizationOptions>(initialVizOptions);
    const [error, setError] = useState<string | null>(null);

    // Manual editor state
    const [sourceNodes, setSourceNodes] = useState<Node[]>([]);
    const [sourceEdges, setSourceEdges] = useState<Edge[]>([]);
    const [backgroundImage, setBackgroundImage] = useState<BackgroundImage | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 400 });
    const [activeTool, setActiveTool] = useState<EditorTool>('select');
    const [activePointType, setActivePointType] = useState<StrategicPointType>(StrategicPointType.SPAWN);
    const [mapScope, setMapScope] = useState<MapScope>('half');
    const [activeTeam, setActiveTeam] = useState<Team>(Team.BLUE);
    const [teamMirror, setTeamMirror] = useState<TeamMirrorAxis>(TeamMirrorAxis.NONE);
    const [mapSymmetry, setMapSymmetry] = useState<SymmetryMode>(SymmetryMode.ROTATION);
    const [connectionStartNode, setConnectionStartNode] = useState<Node | null>(null);
    const [selectedEdgeKeys, setSelectedEdgeKeys] = useState<Set<string>>(new Set());
    const [routes, setRoutes] = useState<Route[]>([]);
    const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null);

    // Info panel state
    const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(false);
    const [activeInfoTab, setActiveInfoTab] = useState<InfoPanelTab>('documentation');
    
    // --- Generator Logic ---
    const handleRegenerate = useCallback(() => {
        try {
            setError(null);
            const newLayout = generateLayout(config);
            setLayout(newLayout);
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("An unknown error occurred during map generation.");
            }
            setLayout(null);
        }
    }, [config]);

    const handleNewMap = useCallback(() => {
        const newSeed = Date.now();
        const newConfig = { ...config, seed: newSeed };
        setConfig(newConfig);
        try {
            setError(null);
            const newLayout = generateLayout(newConfig);
            setLayout(newLayout);
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("An unknown error occurred during map generation.");
            }
            setLayout(null);
        }
    }, [config]);
    
    useEffect(() => {
        handleRegenerate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Manual Editor Logic ---
    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgSrc = e.target?.result as string;
            const img = new Image();
            img.onload = () => {
                const canvasAspect = canvasSize.width / canvasSize.height;
                const imageAspect = img.width / img.height;
                let scale;
                if (canvasAspect > imageAspect) {
                    scale = canvasSize.height / img.height;
                } else {
                    scale = canvasSize.width / img.width;
                }
                setBackgroundImage({
                    src: imgSrc,
                    x: 0,
                    y: 0,
                    scale: scale,
                    opacity: 0.4,
                    width: img.width,
                    height: img.height,
                });
            };
            img.src = imgSrc;
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setBackgroundImage(null);
    };

    const handleClearCanvas = () => {
        setSourceNodes([]);
        setSourceEdges([]);
        setBackgroundImage(null);
        setCanvasSize({ width: 500, height: 400 });
        setSelectedEdgeKeys(new Set());
        setRoutes([]);
        setHighlightedRouteId(null);
    };

    const handleRemoveLastNode = () => {
        if (sourceNodes.length === 0) return;
        const nodeToRemove = sourceNodes[sourceNodes.length - 1];
        setSourceNodes(sourceNodes.slice(0, -1));
        setSourceEdges(edges => edges.filter(p => p.from !== nodeToRemove.id && p.to !== nodeToRemove.id));
    };

    const handleRemoveLastEdge = () => {
        setSourceEdges(edges => edges.slice(0, -1));
    };

    const handleCanvasSizeChange = (dim: 'width' | 'height', value: number) => {
        setCanvasSize(prev => ({...prev, [dim]: value}));
    }

    const handleBgImageChange = <K extends keyof BackgroundImage>(key: K, value: BackgroundImage[K]) => {
        setBackgroundImage(prev => prev ? ({ ...prev, [key]: value }) : null);
    }

    const handleCanvasBackgroundClick = useCallback((pos: Point) => {
        if (activeTool === 'connect' && connectionStartNode) {
            setConnectionStartNode(null);
            return;
        }
        if (activeTool === 'select') {
            setSelectedEdgeKeys(new Set());
            setHighlightedRouteId(null);
        }
        if (activeTool !== 'add') return;

        const team = mapScope === 'half' ? Team.BLUE : activeTeam;
        const effectiveCanvasWidth = canvasSize.width;
        const midX = effectiveCanvasWidth / 2;
        const snapThreshold = 5;
        let finalPos = { ...pos };

        if (mapScope === 'half') {
            if (Math.abs(pos.x - midX) < snapThreshold) {
                finalPos.x = midX;
            } else if (pos.x > midX) {
                 return; // Don't allow placing points on orange side in half mode
            }
        }
        
        const getNextIndex = (nodeTeam: Team, nodeType: StrategicPointType): number => {
            const relevantNodes = sourceNodes.filter(n => n.team === nodeTeam && n.type === nodeType);
            if (relevantNodes.length === 0) return 1;
            const maxIndex = Math.max(...relevantNodes.map(n => {
                const parts = n.id.split('-');
                return parseInt(parts[parts.length - 1], 10) || 0;
            }));
            return maxIndex + 1;
        };
        
        const index = getNextIndex(team, activePointType);
        const abbr = NODE_TYPE_ABBREVIATIONS[activePointType];
        const newId = `${team}-${abbr}-${index}`;

        const newNode: Node = {
            id: newId,
            type: activePointType,
            pos: finalPos,
            team,
        };
        setSourceNodes(prev => [...prev, newNode]);
    }, [activeTool, connectionStartNode, mapScope, activeTeam, canvasSize.width, activePointType, sourceNodes]);

    const handleCanvasNodeClick = useCallback((node: Node) => {
        if (activeTool === 'connect') {
            if (connectionStartNode) { // We are finishing a connection
                let toId = node.id.replace('-mirrored', '');
                if (mapScope === 'half' && node.team === Team.ORANGE) {
                    toId = toId.replace(Team.ORANGE, Team.BLUE);
                }
                
                if (connectionStartNode.id === toId) {
                    setConnectionStartNode(null);
                    return;
                }

                const newEdge: Edge = {
                    from: connectionStartNode.id,
                    to: toId,
                    nodes: [],
                    isCrossTeam: mapScope === 'half' && connectionStartNode.team !== node.team,
                    type: 'walkable',
                };

                const edgeKey = makeEdgeKey(newEdge.from, newEdge.to);
                const edgeExists = sourceEdges.some(p => makeEdgeKey(p.from, p.to) === edgeKey);

                if (!edgeExists) {
                     setSourceEdges(prev => [...prev, newEdge]);
                }
                setConnectionStartNode(null);

            } else { // We are starting a connection
                if ((mapScope === 'half' && node.team === Team.ORANGE) || node.id.includes('-mirrored')) return; 
                setConnectionStartNode(node);
            }
        } else if (activeTool === 'delete') {
            if ((mapScope === 'half' && node.team === Team.ORANGE) || node.id.includes('-mirrored')) return;
            setSourceNodes(prev => prev.filter(p => p.id !== node.id));
            setSourceEdges(prev => prev.filter(edge => edge.from !== node.id && edge.to !== node.id));
            if (connectionStartNode?.id === node.id) setConnectionStartNode(null);
        }
    }, [activeTool, connectionStartNode, mapScope, sourceEdges]);

    const handleCanvasEdgeClick = useCallback((edge: Edge, event: React.MouseEvent) => {
        const sourceFromId = edge.from.replace(/-mirrored$/, '').replace(Team.ORANGE, Team.BLUE);
        const sourceToId = edge.to.replace(/-mirrored$/, '').replace(Team.ORANGE, Team.BLUE);
        const edgeKey = makeEdgeKey(sourceFromId, sourceToId);

        if (activeTool === 'delete') {
            setSourceEdges(prev => prev.filter(p => makeEdgeKey(p.from, p.to) !== edgeKey));
            setSelectedEdgeKeys(prev => { const newSet = new Set(prev); newSet.delete(edgeKey); return newSet; });
        } else if (activeTool === 'select') {
            const isMultiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
            setSelectedEdgeKeys(prev => {
                const newSet = isMultiSelect ? new Set(prev) : new Set<string>();
                if (newSet.has(edgeKey)) {
                    newSet.delete(edgeKey);
                } else {
                    newSet.add(edgeKey);
                }
                return newSet;
            });
            setHighlightedRouteId(null);
        }
    }, [activeTool]);

    const handleUpdateSelectedEdgeProps = useCallback((props: Partial<Pick<Edge, 'type' | 'purpose'>>) => {
        setSourceEdges(prevEdges => prevEdges.map(p => {
            if (selectedEdgeKeys.has(makeEdgeKey(p.from, p.to))) {
                return { ...p, ...props };
            }
            return p;
        }));
    }, [selectedEdgeKeys]);

    const handleCreateRoute = useCallback((name: string, purpose: string) => {
        if (!name || selectedEdgeKeys.size === 0) return;
        const newRoute: Route = {
            id: `route-${Date.now()}`,
            name,
            purpose,
            edgeKeys: Array.from(selectedEdgeKeys),
        };
        setRoutes(prev => [...prev, newRoute]);
        setSelectedEdgeKeys(new Set());
    }, [selectedEdgeKeys]);

    const handleDeleteRoute = useCallback((routeId: string) => {
        setRoutes(prev => prev.filter(r => r.id !== routeId));
        if (highlightedRouteId === routeId) {
            setHighlightedRouteId(null);
        }
    }, [highlightedRouteId]);

    const derivedManualLayout = useMemo(() => {
        if (mode !== 'manual') return { allNodes: [], allEdges: [] };

        const getEdgeProps = (from: string, to: string) => {
            const key = makeEdgeKey(from, to);
            const sourceEdge = sourceEdges.find(p => makeEdgeKey(p.from, p.to) === key);
            return { type: sourceEdge?.type, purpose: sourceEdge?.purpose };
        };

        if (mapScope === 'full') {
            const nodesWithRoundedPos = sourceNodes.map(p => ({ ...p, pos: { x: Math.round(p.pos.x), y: Math.round(p.pos.y) }}));
            const edgesWithNodes = sourceEdges.map(edge => {
                const fromNode = nodesWithRoundedPos.find(p => p.id === edge.from);
                const toNode = nodesWithRoundedPos.find(p => p.id === edge.to);
                return { ...edge, ...getEdgeProps(edge.from, edge.to), nodes: fromNode && toNode ? [fromNode.pos, toNode.pos] : [] };
            });
            return { allNodes: nodesWithRoundedPos, allEdges: edgesWithNodes };
        }

        const blueSourceNodes = sourceNodes.filter(p => p.team === Team.BLUE);
        let derivedBlueNodes: Node[] = [...blueSourceNodes];
        
        if (teamMirror === TeamMirrorAxis.HORIZONTAL) {
            const midY = canvasSize.height / 2;
            blueSourceNodes.forEach(p => {
                const mirroredId = `${p.id}-mirrored`;
                if (Math.abs(p.pos.y - midY) > 0.1 && !derivedBlueNodes.find(dp => dp.id === mirroredId)) {
                    derivedBlueNodes.push({ ...p, id: mirroredId, pos: { x: p.pos.x, y: 2 * midY - p.pos.y }});
                }
            });
        }
        
        const midX = canvasSize.width / 2;
        const nodesToMirror = derivedBlueNodes.filter(p => Math.abs(p.pos.x - midX) > 0.1);
        const orangeNodes: Node[] = nodesToMirror.map(p => {
            let newPos: Point;
            if (mapSymmetry === SymmetryMode.MIRROR) {
                newPos = { x: canvasSize.width - p.pos.x, y: p.pos.y };
            } else {
                newPos = { x: canvasSize.width - p.pos.x, y: canvasSize.height - p.pos.y };
            }
            return { ...p, id: p.id.replace(Team.BLUE, Team.ORANGE), team: Team.ORANGE, pos: newPos };
        });

        const allGeneratedNodes = [...derivedBlueNodes, ...orangeNodes].map(p => ({ ...p, pos: { x: Math.round(p.pos.x), y: Math.round(p.pos.y) }}));
        
        const finalEdges: Edge[] = [];
        for (const edge of sourceEdges) {
            const b_from = allGeneratedNodes.find(p => p.id === edge.from);
            const b_to = allGeneratedNodes.find(p => p.id === edge.to);
            if (!b_from || !b_to) continue;
            
            const edgeProps = getEdgeProps(edge.from, edge.to);

            if (!edge.isCrossTeam) {
                finalEdges.push({ ...edge, ...edgeProps, nodes: [b_from.pos, b_to.pos] });
                const b_from_is_midline = Math.abs(b_from.pos.x - midX) < 0.1;
                const b_to_is_midline = Math.abs(b_to.pos.x - midX) < 0.1;
                if (b_from_is_midline && b_to_is_midline) continue;
                
                const o_from_node = b_from_is_midline ? b_from : allGeneratedNodes.find(p => p.id === edge.from.replace(Team.BLUE, Team.ORANGE));
                const o_to_node = b_to_is_midline ? b_to : allGeneratedNodes.find(p => p.id === edge.to.replace(Team.BLUE, Team.ORANGE));
                    
                if (o_from_node && o_to_node) {
                    finalEdges.push({ from: o_from_node.id, to: o_to_node.id, ...edgeProps, nodes: [o_from_node.pos, o_to_node.pos] });
                }
            } else { 
                const o_to = allGeneratedNodes.find(p => p.id === edge.to.replace(Team.BLUE, Team.ORANGE));
                if (o_to) finalEdges.push({ from: b_from.id, to: o_to.id, ...edgeProps, nodes: [b_from.pos, o_to.pos] });
                
                const o_from = allGeneratedNodes.find(p => p.id === edge.from.replace(Team.BLUE, Team.ORANGE));
                if (o_from) finalEdges.push({ from: o_from.id, to: b_to.id, ...edgeProps, nodes: [o_from.pos, b_to.pos] });
            }
        }
        return { allNodes: allGeneratedNodes, allEdges: finalEdges };

    }, [sourceNodes, sourceEdges, mapScope, teamMirror, mapSymmetry, canvasSize, mode]);

    const handleDownloadJson = () => {
        let dataToExport;
        const filename = `ctw-map-${Date.now()}.json`;

        if (mode === 'generator' && layout) {
            const allNodes = Object.values(layout.teams).flatMap(t => t?.nodes || []);
            const allEdges = Object.values(layout.teams).flatMap(t => t?.edges || []);
            dataToExport = {
                width: layout.width,
                height: layout.height,
                nodes: allNodes.map(({ id, type, team, pos }) => ({ id, type, team, x: Math.round(pos.x), y: Math.round(pos.y) })),
                edges: allEdges.map(({ from, to, type, purpose }) => ({ from, to, type, purpose })),
            };
        } else if (mode === 'manual') {
            const { allNodes, allEdges } = derivedManualLayout;
            if (allNodes.length === 0) return;
            dataToExport = {
                width: canvasSize.width,
                height: canvasSize.height,
                nodes: allNodes.map(({ id, type, team, pos }) => ({ id, type, team, x: Math.round(pos.x), y: Math.round(pos.y) })),
                edges: allEdges.map(({ from, to, type, purpose }) => ({ from, to, type, purpose })),
                routes: routes.map(({ name, purpose, edgeKeys }) => ({ name, purpose, edgeKeys })),
            };
        }

        if (!dataToExport) return;

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- UI Logic ---
    const toggleInfoPanel = (tab: InfoPanelTab) => {
        if (isInfoPanelVisible && activeInfoTab === tab) {
            setIsInfoPanelVisible(false);
        } else {
            setActiveInfoTab(tab);
            setIsInfoPanelVisible(true);
        }
    };

    const nodesForCoords = useMemo(() => {
        if (mode === 'generator' && layout?.teams) {
            return Object.values(layout.teams).flatMap(t => t?.nodes || []);
        }
        if (mode === 'manual') {
            return derivedManualLayout.allNodes;
        }
        return [];
    }, [mode, layout, derivedManualLayout]);
    
    const highlightedEdgeKeys = useMemo(() => {
        if (!highlightedRouteId) return new Set<string>();
        const route = routes.find(r => r.id === highlightedRouteId);
        return new Set(route?.edgeKeys || []);
    }, [highlightedRouteId, routes]);


    const TabButton: React.FC<{ tabId: InfoPanelTab; children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveInfoTab(tabId)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeInfoTab === tabId
                    ? 'border-b-2 border-blue-400 text-white'
                    : 'text-gray-400 hover:text-gray-200'
            }`}
        >
            {children}
        </button>
    );

    const ModeButton: React.FC<{ targetMode: AppMode, children: React.ReactNode }> = ({ targetMode, children }) => (
         <button
            onClick={() => setMode(targetMode)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                mode === targetMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
        >
            {children}
        </button>
    );


    return (
        <div className="flex flex-col h-screen bg-gray-900 font-sans">
            <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex justify-between items-center z-20">
                 <h1 className="text-xl font-bold text-white">Minecraft CTW Tools</h1>
                 <div className="flex items-center space-x-2">
                     <ModeButton targetMode="generator">Generator</ModeButton>
                     <ModeButton targetMode="manual">Manual Editor</ModeButton>
                 </div>
            </header>
            <div className="flex flex-row flex-grow" style={{ height: 'calc(100vh - 61px)'}}>
                <aside className="w-80 lg:w-96 bg-gray-800 shrink-0 h-full">
                    {mode === 'generator' ? (
                        <Controls
                            config={config}
                            setConfig={setConfig}
                            onRegenerate={handleRegenerate}
                            onNewMap={handleNewMap}
                            vizOptions={vizOptions}
                            setVizOptions={setVizOptions}
                            onToggleDocumentation={() => toggleInfoPanel('documentation')}
                            onDownloadJson={handleDownloadJson}
                        />
                    ) : (
                        <ManualControls
                           onUploadImage={handleImageUpload}
                           onClearCanvas={handleClearCanvas}
                           onRemoveLastNode={handleRemoveLastNode}
                           onRemoveLastEdge={handleRemoveLastEdge}
                           onRemoveImage={handleRemoveImage}
                           backgroundImage={backgroundImage}
                           onDownloadJson={handleDownloadJson}
                           activeTool={activeTool}
                           setActiveTool={setActiveTool}
                           activePointType={activePointType}
                           setActivePointType={setActivePointType}
                           mapScope={mapScope}
                           setMapScope={setMapScope}
                           activeTeam={activeTeam}
                           setActiveTeam={setActiveTeam}
                           teamMirror={teamMirror}
                           setTeamMirror={setTeamMirror}
                           mapSymmetry={mapSymmetry}
                           setMapSymmetry={setMapSymmetry}
                           vizOptions={vizOptions}
                           setVizOptions={setVizOptions}
                           canvasSize={canvasSize}
                           onCanvasSizeChange={handleCanvasSizeChange}
                           onBgImageChange={handleBgImageChange}
                           sourceEdges={sourceEdges}
                           selectedEdgeKeys={selectedEdgeKeys}
                           onUpdateSelectedEdgeProps={handleUpdateSelectedEdgeProps}
                           routes={routes}
                           onCreateRoute={handleCreateRoute}
                           onDeleteRoute={handleDeleteRoute}
                           highlightedRouteId={highlightedRouteId}
                           setHighlightedRouteId={setHighlightedRouteId}
                        />
                    )}
                </aside>
                <main className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-900 relative overflow-hidden">
                    {mode === 'generator' ? (
                        <>
                        {error && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white p-4 rounded-lg shadow-lg z-10 max-w-md text-center">
                                <h3 className="font-bold text-lg mb-1">Error</h3>
                                <p>{error}</p>
                            </div>
                        )}
                        {layout ? (
                            <MapVisualizer layout={layout} options={vizOptions} />
                        ) : (
                            <div className="text-gray-500 text-2xl">
                                {error ? 'Could not generate map' : 'Generating map...'}
                            </div>
                        )}
                        </>
                    ) : (
                        <ManualCanvas 
                            allNodes={derivedManualLayout.allNodes}
                            allEdges={derivedManualLayout.allEdges}
                            backgroundImage={backgroundImage}
                            canvasSize={canvasSize}
                            mapScope={mapScope}
                            teamMirror={teamMirror}
                            activeTool={activeTool}
                            connectionStartNode={connectionStartNode}
                            onCanvasClick={handleCanvasBackgroundClick}
                            onNodeClick={handleCanvasNodeClick}
                            onEdgeClick={handleCanvasEdgeClick}
                            options={vizOptions}
                            selectedEdgeKeys={selectedEdgeKeys}
                            highlightedEdgeKeys={highlightedEdgeKeys}
                            makeEdgeKey={makeEdgeKey}
                        />
                    )}
                </main>
                {isInfoPanelVisible && nodesForCoords.length > 0 && (
                    <aside className="w-80 lg:w-96 bg-gray-800 shrink-0 h-full flex flex-col p-6 border-l border-gray-700">
                        <header className="flex justify-between items-center shrink-0 mb-4 pb-3 border-b border-gray-700">
                            <div className="flex items-center space-x-2">
                            <TabButton tabId="documentation">Documentation</TabButton>
                            <TabButton tabId="coordinates">Coordinates</TabButton>
                            </div>
                            <button onClick={() => setIsInfoPanelVisible(false)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-full transition-colors" title="Close Panel">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </header>
                        <div className="flex-grow overflow-y-auto">
                            {activeInfoTab === 'documentation' && <Documentation />}
                            {activeInfoTab === 'coordinates' && <CoordinateDisplay nodes={nodesForCoords} />}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default App;