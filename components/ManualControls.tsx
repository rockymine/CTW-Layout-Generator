import React, { useMemo, useState } from 'react';
import { StrategicPointType, EditorTool, MapScope, Team, TeamMirrorAxis, SymmetryMode, VisualizationOptions, BackgroundImage, EdgeType, Edge, Route } from '../types';
import { POINT_COLORS } from './StrategicPointSymbol';

const makeEdgeKey = (from: string, to: string) => [from, to].sort().join('--');

interface ManualControlsProps {
    onUploadImage: (file: File) => void;
    onClearCanvas: () => void;
    onRemoveLastNode: () => void;
    onRemoveLastEdge: () => void;
    onRemoveImage: () => void;
    onDownloadJson: () => void;
    
    backgroundImage: BackgroundImage | null;
    onBgImageChange: <K extends keyof BackgroundImage>(key: K, value: BackgroundImage[K]) => void;

    canvasSize: { width: number; height: number };
    onCanvasSizeChange: (dim: 'width' | 'height', value: number) => void;

    activeTool: EditorTool;
    setActiveTool: (tool: EditorTool) => void;
    
    activePointType: StrategicPointType;
    setActivePointType: (type: StrategicPointType) => void;
    
    mapScope: MapScope;
    setMapScope: (scope: MapScope) => void;
    
    activeTeam: Team;
    setActiveTeam: (team: Team) => void;
    
    teamMirror: TeamMirrorAxis;
    setTeamMirror: (axis: TeamMirrorAxis) => void;

    mapSymmetry: SymmetryMode;
    setMapSymmetry: (mode: SymmetryMode) => void;

    vizOptions: VisualizationOptions;
    setVizOptions: React.Dispatch<React.SetStateAction<VisualizationOptions>>;

    sourceEdges: Edge[];
    selectedEdgeKeys: Set<string>;
    onUpdateSelectedEdgeProps: (props: Partial<Pick<Edge, 'type' | 'purpose'>>) => void;

    routes: Route[];
    onCreateRoute: (name: string, purpose: string) => void;
    onDeleteRoute: (routeId: string) => void;
    highlightedRouteId: string | null;
    setHighlightedRouteId: (id: string | null) => void;
}

const ControlSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-4 p-4 bg-gray-700/50 rounded-lg">
        <h2 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">{title}</h2>
        <div className="space-y-4 pt-2">{children}</div>
    </div>
);

const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center space-x-2 cursor-pointer">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
        />
        <span className="text-gray-300 text-sm">{label}</span>
    </label>
);

const RadioGroup: React.FC<{ label: string; value: string; options: {value: string, label: string}[]; onChange: (value: string) => void; disabled?: boolean }> = ({ label, value, options, onChange, disabled }) => (
    <div>
        <label className="text-sm font-medium text-gray-400 mb-2 block">{label}</label>
        <div className="flex flex-wrap gap-2">
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    disabled={disabled}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        value === opt.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    </div>
);

const NODE_TYPE_NAMES: Record<StrategicPointType, string> = {
    [StrategicPointType.WOOL]: 'Wool',
    [StrategicPointType.WOOL_ENTRY]: 'Wool Entry',
    [StrategicPointType.SPAWN]: 'Spawn',
    [StrategicPointType.SPAWN_ENTRY]: 'Spawn Entry',
    [StrategicPointType.FRONT_LINE]: 'Front Line',
    [StrategicPointType.FRONT_LINE_ENTRY]: 'Front Line Entry',
    [StrategicPointType.HUB]: 'Hub',
    [StrategicPointType.ISLAND]: 'Island',
    [StrategicPointType.HELPER]: 'Helper',
    [StrategicPointType.CENTER_HUB]: 'Center Hub',
};

const NodeTypePalette: React.FC<{
    activePointType: StrategicPointType;
    setActivePointType: (type: StrategicPointType) => void;
    disabled: boolean;
}> = ({ activePointType, setActivePointType, disabled }) => {
    return (
        <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Node Type</label>
            <div className="grid grid-cols-5 gap-2">
                {Object.values(StrategicPointType).map(pt => {
                    const isActive = activePointType === pt && !disabled;
                    const color = POINT_COLORS[pt];
                    return (
                        <button
                            key={pt}
                            onClick={() => setActivePointType(pt)}
                            disabled={disabled}
                            title={NODE_TYPE_NAMES[pt]}
                            className={`
                                w-full aspect-square flex items-center justify-center font-mono font-bold text-sm rounded-md transition-all border-2
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500
                                ${
                                    isActive
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-gray-700 border-transparent text-gray-300 hover:enabled:bg-gray-600 hover:enabled:border-gray-500'
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent
                            `}
                            style={isActive ? { borderColor: color } : {}}
                            aria-label={`Select node type ${NODE_TYPE_NAMES[pt]}`}
                            aria-pressed={isActive}
                        >
                            {pt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const NumberInput: React.FC<{ label: string; value: number; onChange: (val: number) => void; min: number; max: number; step: number;}> = ({ label, value, onChange, min, max, step }) => (
    <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            min={min}
            max={max}
            step={step}
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
    </div>
);

const SliderInput: React.FC<{ label: string; value: number; onChange: (val: number) => void; min: number; max: number; step: number;}> = ({ label, value, onChange, min, max, step }) => (
    <div className="flex flex-col">
        <div className="flex justify-between items-baseline">
            <label className="text-sm font-medium text-gray-400 mb-1">{label}</label>
            <span className="text-xs font-mono text-gray-300">{Number(value).toFixed(2)}</span>
        </div>
        <input
            type="range"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
    </div>
);

const TextInput: React.FC<{ label: string; value: string; onChange: (val: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
    </div>
);

const ManualControls: React.FC<ManualControlsProps> = (props) => {
    const { 
        onUploadImage, onRemoveLastNode, onRemoveImage, onDownloadJson, vizOptions, setVizOptions, 
        onRemoveLastEdge, backgroundImage, canvasSize, onCanvasSizeChange, onBgImageChange, 
        sourceEdges, selectedEdgeKeys, onUpdateSelectedEdgeProps,
        routes, onCreateRoute, onDeleteRoute, highlightedRouteId, setHighlightedRouteId,
    } = props;
    
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [routeName, setRouteName] = useState('');
    const [routePurpose, setRoutePurpose] = useState('');

    const selectedEdge = useMemo(() => {
        if (selectedEdgeKeys.size !== 1) return null;
        const key = selectedEdgeKeys.values().next().value;
        return sourceEdges.find(p => makeEdgeKey(p.from, p.to) === key) || null;
    }, [selectedEdgeKeys, sourceEdges]);

    const handleVizChange = <K extends keyof VisualizationOptions,>(key: K, value: VisualizationOptions[K]) => {
        setVizOptions(prev => ({...prev, [key]: value}));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUploadImage(file);
        }
    };
    
    const handleCreateRouteClick = () => {
        onCreateRoute(routeName, routePurpose);
        setRouteName('');
        setRoutePurpose('');
    };

    return (
        <div className="flex flex-col h-full p-6">
            <header className="shrink-0 mb-6">
                 <h1 className="text-3xl font-bold text-white">Manual Editor</h1>
            </header>
            <div className="flex-grow space-y-6 overflow-y-auto pr-2 -mr-2">
                <ControlSection title="Canvas">
                    <div className="flex flex-col space-y-2">
                         <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Upload Background</button>
                        {backgroundImage && <button onClick={onRemoveImage} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Remove Background</button>}
                        <button onClick={onDownloadJson} className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Download JSON</button>
                        <button onClick={onRemoveLastNode} className="w-full bg-yellow-700 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Remove Last Node</button>
                        <button onClick={onRemoveLastEdge} className="w-full bg-yellow-700 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Remove Last Edge</button>
                        <button onClick={props.onClearCanvas} className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Clear Canvas</button>
                    </div>
                </ControlSection>

                <ControlSection title="Canvas Dimensions">
                    <div className="grid grid-cols-2 gap-4">
                        <NumberInput label="Width" value={canvasSize.width} onChange={v => onCanvasSizeChange('width', v)} min={100} max={2000} step={10} />
                        <NumberInput label="Height" value={canvasSize.height} onChange={v => onCanvasSizeChange('height', v)} min={100} max={2000} step={10} />
                    </div>
                </ControlSection>

                {backgroundImage && (
                    <ControlSection title="Background Image">
                        <SliderInput label="X Offset" value={backgroundImage.x} onChange={v => onBgImageChange('x', v)} min={-canvasSize.width} max={canvasSize.width} step={1} />
                        <SliderInput label="Y Offset" value={backgroundImage.y} onChange={v => onBgImageChange('y', v)} min={-canvasSize.height} max={canvasSize.height} step={1} />
                        <SliderInput label="Scale" value={backgroundImage.scale} onChange={v => onBgImageChange('scale', v)} min={0.1} max={5} step={0.05} />
                        <SliderInput label="Opacity" value={backgroundImage.opacity} onChange={v => onBgImageChange('opacity', v)} min={0} max={1} step={0.05} />
                    </ControlSection>
                )}

                <ControlSection title="Tools">
                   <RadioGroup label="Active Tool" value={props.activeTool} onChange={v => props.setActiveTool(v as EditorTool)}
                        options={[{value: 'select', label: 'Select'}, {value: 'add', label: 'Add Node'}, {value: 'connect', label: 'Connect'}, {value: 'delete', label: 'Delete'}]}
                   />
                    <NodeTypePalette activePointType={props.activePointType} setActivePointType={props.setActivePointType} disabled={props.activeTool !== 'add'} />
                </ControlSection>
                
                <ControlSection title="Selection Editor">
                    {selectedEdgeKeys.size === 0 && <p className="text-sm text-gray-400">Select an edge to edit its properties, or hold Shift to select multiple edges to create a route.</p>}
                    {selectedEdge && (
                        <>
                           <RadioGroup label="Edge Type" value={selectedEdge.type || 'walkable'} onChange={v => onUpdateSelectedEdgeProps({ type: v as EdgeType })} options={[{value: 'walkable', label: 'Walkable'}, {value: 'bridgeable', label: 'Bridgeable'}]} />
                           <TextInput label="Edge Purpose" value={selectedEdge.purpose || ''} onChange={v => onUpdateSelectedEdgeProps({ purpose: v })} placeholder="e.g., Main push, Flank..." />
                        </>
                    )}
                    {selectedEdgeKeys.size > 1 && (
                        <>
                            <p className="text-sm text-gray-300 font-medium">{selectedEdgeKeys.size} edges selected.</p>
                            <TextInput label="Route Name" value={routeName} onChange={setRouteName} placeholder="e.g., Blue Left Flank" />
                            <TextInput label="Route Purpose" value={routePurpose} onChange={setRoutePurpose} placeholder="e.g., Rush to top wool" />
                            <button onClick={handleCreateRouteClick} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Create Route</button>
                        </>
                    )}
                </ControlSection>

                 <ControlSection title="Routes">
                    {routes.length === 0 ? <p className="text-sm text-gray-400">No routes defined yet.</p> : (
                        <ul className="space-y-2">
                            {routes.map(route => (
                                <li key={route.id} className={`p-2 rounded-md transition-colors ${highlightedRouteId === route.id ? 'bg-gray-600' : 'bg-gray-800/50'}`}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-gray-200 text-sm">{route.name}</p>
                                            <p className="text-xs text-gray-400">{route.purpose}</p>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <button title="Highlight Route" onClick={() => setHighlightedRouteId(highlightedRouteId === route.id ? null : route.id)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md">
                                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 3.568A1 1 0 008 4.445v.994a1 1 0 001.555.832l3.332-1.993a.5.5 0 01.888.416v5.498a.5.5 0 01-.888.416l-3.332-1.993a1 1 0 00-1.555.832v.994a1 1 0 001.555.832l3.332-1.993a.5.5 0 01.888.416v2.748a.5.5 0 01-.888.416l-3.332-1.993a1 1 0 00-1.555.832v.994a1 1 0 001.555.832L14 12.555a1 1 0 001.555-.832V5.277a1 1 0 00-1.555-.832l-4.445 2.123z" clipRule="evenodd" /></svg>
                                            </button>
                                            <button title="Delete Route" onClick={() => onDeleteRoute(route.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-md">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </ControlSection>

                <ControlSection title="Layout & Symmetry">
                    <RadioGroup label="Map Scope" value={props.mapScope} onChange={v => props.setMapScope(v as MapScope)} options={[{value: 'half', label: 'Half'}, {value: 'full', label: 'Full'}]} />
                    <RadioGroup label="Active Team" value={props.activeTeam} onChange={v => props.setActiveTeam(v as Team)} options={[{value: Team.BLUE, label: 'Blue'}, {value: Team.ORANGE, label: 'Orange'}]} disabled={props.mapScope === 'half'} />
                    <RadioGroup label="Intra-Team Symmetry (for Half mode)" value={props.teamMirror} onChange={v => props.setTeamMirror(v as TeamMirrorAxis)} options={[{value: TeamMirrorAxis.NONE, label: 'None'}, {value: TeamMirrorAxis.HORIZONTAL, label: 'Horizontal'}]} disabled={props.mapScope === 'full'} />
                    <RadioGroup label="Inter-Team Symmetry" value={props.mapSymmetry} onChange={v => props.setMapSymmetry(v as SymmetryMode)} options={Object.values(SymmetryMode).map(m => ({value: m, label: m}))} disabled={props.mapScope === 'full'} />
                </ControlSection>

                <ControlSection title="Visualization">
                     <Checkbox label="Show Path Lengths" checked={vizOptions.showPathLengths} onChange={(v) => handleVizChange('showPathLengths', v)} />
                </ControlSection>
            </div>
        </div>
    );
};

export default ManualControls;