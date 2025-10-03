import React, { useEffect, useMemo, useState } from 'react';
import { StrategicPointType, EditorTool, MapScope, Team, TeamMirrorAxis, SymmetryMode, VisualizationOptions, BackgroundImage, EdgeType, Edge, Route } from '../types';
import { POINT_COLORS } from './StrategicPointSymbol';

const makeEdgeKey = (from: string, to: string) => [from, to].sort().join('--');

// --- Reusable UI Components ---

const Icon: React.FC<{ name: string, className?: string }> = ({ name, className = "h-5 w-5" }) => {
    const icons: Record<string, React.ReactNode> = {
        'upload': <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />,
        'no-symbol': <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />,
        'download': <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />,
        'undo': <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />,
        'trash': <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />,
        'select': <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.832.168l-1.171 1.951M21.75 12h-2.25m-.168 5.832l-1.951-1.171M5.25 4.668l1.171 1.951M2.25 12h2.25m.168 5.832l1.951-1.171M12 21.75V19.5" />,
        'add': <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
        'connect': <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />,
        'delete': <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
        'eye': <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    };
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            {icons[name]}
        </svg>
    );
};

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    return (
        <div className="border-b border-gray-700">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left font-medium text-gray-200 hover:bg-gray-700/50 transition-colors"
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform text-gray-400 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="px-4 pb-4 space-y-4">
                    {children}
                </div>
            )}
        </div>
    );
};

const ToggleSwitch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer py-1">
        <span className="text-gray-300 text-sm">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
        </div>
    </label>
);


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

const RadioGroup: React.FC<{ label: string; value: string; options: {value: string, label: string, icon?: string}[]; onChange: (value: string) => void; disabled?: boolean, isToolbar?: boolean }> = ({ label, value, options, onChange, disabled, isToolbar }) => (
    <div>
        <label className="text-sm font-medium text-gray-400 mb-2 block">{label}</label>
        <div className={isToolbar ? "grid grid-cols-4 gap-2" : "flex flex-wrap gap-2"}>
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    disabled={disabled}
                    title={opt.label}
                    className={`
                        flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                        ${isToolbar ? 'flex-col h-16 text-xs' : ''}
                        ${
                        value === opt.value
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {opt.icon && <Icon name={opt.icon} className="h-5 w-5" />}
                    {!isToolbar || <span>{opt.label}</span>}
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

const NodeTypeIcon: React.FC<{ type: StrategicPointType, size?: number }> = ({ type, size = 20 }) => {
    const color = POINT_COLORS[type];
    const s = size * 0.7; // Scale factor for icon size within the viewbox
    const x = size / 2;
    const y = size / 2;

    const getShape = () => {
        const shapeProps = {
            stroke: 'white',
            strokeWidth: "1",
            fill: color,
        };

        switch (type) {
            case StrategicPointType.WOOL:
                return <rect x={x - s / 2} y={y - s / 2} width={s} height={s} {...shapeProps} />;
            case StrategicPointType.SPAWN:
                return <circle cx={x} cy={y} r={s / 2} {...shapeProps} />;
            case StrategicPointType.SPAWN_ENTRY:
                return <path d={`M ${x - s/3} ${y - s/2} L ${x + s/2} ${y} L ${x - s/3} ${y + s/2} Z`} {...shapeProps} />;
            case StrategicPointType.WOOL_ENTRY: {
                const r = s / 2;
                const pathData = Array.from({ length: 5 }).map((_, i) => { const a = 72 * i - 90; return `${x + r * Math.cos(a*Math.PI/180)},${y + r * Math.sin(a*Math.PI/180)}`; }).join(' L ');
                return <path d={`M ${pathData} Z`} {...shapeProps} />;
            }
            case StrategicPointType.FRONT_LINE_ENTRY:
                 return <path d={`M ${x} ${y - s/2} L ${x + s/2} ${y} L ${x} ${y + s/2} L ${x - s/2} ${y} Z`} {...shapeProps} />;
            case StrategicPointType.FRONT_LINE: {
                const r = s / 2;
                const pathData = Array.from({ length: 6 }).map((_, i) => { const a = 60 * i - 90; return `${x + r * Math.cos(a*Math.PI/180)},${y + r * Math.sin(a*Math.PI/180)}`; }).join(' L ');
                return <path d={`M ${pathData} Z`} {...shapeProps} />;
            }
            case StrategicPointType.HUB:
                return <circle cx={x} cy={y} r={s / 3} {...shapeProps} />;
            case StrategicPointType.CENTER_HUB:
                return <path d={`M ${x - s/2.5} ${y - s/2.5} L ${x + s/2.5} ${y + s/2.5} M ${x - s/2.5} ${y + s/2.5} L ${x + s/2.5} ${y - s/2.5}`} stroke={color} strokeWidth="1.5" fill="none" />;
            case StrategicPointType.ISLAND:
                return <rect x={x - s / 3} y={y - s / 3} width={s/1.5} height={s/1.5} {...shapeProps} />;
            case StrategicPointType.HELPER:
                return <path d={`M ${x - s/3} ${y} L ${x + s/3} ${y} M ${x} ${y - s/3} L ${x} ${y + s/3}`} stroke={color} strokeWidth="1.5" fill="none" />;
            default: return null;
        }
    };
    return <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">{getShape()}</svg>;
}


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
                    return (
                        <button
                            key={pt}
                            onClick={() => setActivePointType(pt)}
                            disabled={disabled}
                            title={NODE_TYPE_NAMES[pt]}
                            className={`
                                w-full aspect-square flex items-center justify-center rounded-md transition-all border-2
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500
                                ${
                                    isActive
                                        ? 'bg-gray-600 border-blue-500'
                                        : 'bg-gray-700 border-transparent text-gray-300 hover:enabled:bg-gray-600 hover:enabled:border-gray-500'
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent
                            `}
                            aria-label={`Select node type ${NODE_TYPE_NAMES[pt]}`}
                            aria-pressed={isActive}
                        >
                           <NodeTypeIcon type={pt} />
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
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
    </div>
);

const buttonStyles = {
    base: "w-full flex items-center justify-center gap-2 font-semibold py-2 px-3 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed",
    primary: "bg-blue-600 hover:enabled:bg-blue-500 text-white",
    secondary: "bg-gray-600 hover:enabled:bg-gray-500 text-gray-100",
    tertiary: "bg-gray-700 hover:enabled:bg-gray-600 text-gray-300",
    destructive: "bg-red-700 hover:enabled:bg-red-600 text-white",
};

const StepSection: React.FC<{ title: string; children: React.ReactNode; info: string }> = ({ title, children, info }) => (
    <div className="space-y-4">
        <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">{info}</p>
        </div>
        <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg">{children}</div>
    </div>
);

const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = ['Setup', 'Placement', 'Routes'];
    return (
         <nav aria-label="Progress" className="mb-4">
            <ol role="list" className="flex items-center">
                {steps.map((step, index) => (
                    <li key={step} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                        <div className={`flex items-center text-sm font-medium ${currentStep > index + 1 ? 'text-blue-400' : currentStep === index + 1 ? 'text-blue-400' : 'text-gray-500'}`}>
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${currentStep > index + 1 ? 'border-blue-400' : currentStep === index + 1 ? 'border-blue-400' : 'border-gray-600'}`}>
                                {index + 1}
                            </span>
                            <span className="ml-2 hidden sm:block">{step}</span>
                        </div>
                        {index < steps.length - 1 && <div className={`ml-4 h-0.5 w-full ${currentStep > index + 1 ? 'bg-blue-400' : 'bg-gray-600'}`} />}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

const SetupStep: React.FC<ManualControlsProps & { onNext: () => void }> = (props) => {
    const { onUploadImage, onRemoveImage, onClearCanvas, backgroundImage, canvasSize, onCanvasSizeChange, onBgImageChange, onNext } = props;
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUploadImage(file);
        }
    };

    return (
        <div className="space-y-6">
            <StepSection title="Step 1: Canvas & Layout" info="Define the canvas dimensions and map symmetry. You can also upload a background image to trace over.">
                <div className="grid grid-cols-2 gap-4">
                    <NumberInput label="Width" value={canvasSize.width} onChange={v => onCanvasSizeChange('width', v)} min={100} max={2000} step={10} />
                    <NumberInput label="Height" value={canvasSize.height} onChange={v => onCanvasSizeChange('height', v)} min={100} max={2000} step={10} />
                </div>
                 <div className="grid grid-cols-2 gap-2">
                    <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
                        <Icon name="upload" className="h-4 w-4" /><span>Upload BG</span>
                    </button>
                    <button onClick={onRemoveImage} disabled={!backgroundImage} className={`${buttonStyles.base} ${buttonStyles.tertiary}`}>
                        <Icon name="no-symbol" className="h-4 w-4" /><span>Remove BG</span>
                    </button>
                </div>
                {backgroundImage && (
                    <div className="pt-4 border-t border-gray-700 space-y-3">
                        <h3 className="text-sm font-medium text-gray-300">Background Image</h3>
                        <SliderInput label="X Offset" value={backgroundImage.x} onChange={v => onBgImageChange('x', v)} min={-canvasSize.width} max={canvasSize.width} step={1} />
                        <SliderInput label="Y Offset" value={backgroundImage.y} onChange={v => onBgImageChange('y', v)} min={-canvasSize.height} max={canvasSize.height} step={1} />
                        <SliderInput label="Scale" value={backgroundImage.scale} onChange={v => onBgImageChange('scale', v)} min={0.1} max={5} step={0.05} />
                        <SliderInput label="Opacity" value={backgroundImage.opacity} onChange={v => onBgImageChange('opacity', v)} min={0} max={1} step={0.05} />
                    </div>
                )}
            </StepSection>
             <StepSection title="Symmetry" info="Choose how your map will be structured and mirrored. These settings are crucial for creating balanced layouts.">
                 <RadioGroup label="Map Scope" value={props.mapScope} onChange={v => props.setMapScope(v as MapScope)} options={[{value: 'half', label: 'Half'}, {value: 'full', label: 'Full'}]} />
                 <RadioGroup label="Active Team" value={props.activeTeam} onChange={v => props.setActiveTeam(v as Team)} options={[{value: Team.BLUE, label: 'Blue'}, {value: Team.ORANGE, label: 'Orange'}]} disabled={props.mapScope === 'half'} />
                 <RadioGroup label="Intra-Team Symmetry (Half Mode)" value={props.teamMirror} onChange={v => props.setTeamMirror(v as TeamMirrorAxis)} options={[{value: TeamMirrorAxis.NONE, label: 'None'}, {value: TeamMirrorAxis.HORIZONTAL, label: 'Horizontal'}]} disabled={props.mapScope === 'full'} />
                 <RadioGroup label="Inter-Team Symmetry" value={props.mapSymmetry} onChange={v => props.setMapSymmetry(v as SymmetryMode)} options={Object.values(SymmetryMode).map(m => ({value: m, label: m}))} disabled={props.mapScope === 'full'} />
             </StepSection>
            <div className="grid grid-cols-2 gap-2">
                 <button onClick={onClearCanvas} className={`${buttonStyles.base} ${buttonStyles.destructive}`}>
                    <Icon name="trash" className="h-4 w-4" /><span>Clear & Restart</span>
                </button>
                <button onClick={onNext} className={`${buttonStyles.base} ${buttonStyles.primary}`}>
                    Continue to Placement
                </button>
            </div>
        </div>
    );
};

const PlacementStep: React.FC<ManualControlsProps & { onNext: () => void; onBack: () => void }> = (props) => {
    return (
        <div className="space-y-6">
            <StepSection title="Step 2: Place Nodes & Edges" info="Use the tools to add nodes to the canvas. Select 'Connect' to draw edges between them. Undo actions or clear the canvas as needed.">
                <RadioGroup label="Active Tool" value={props.activeTool} onChange={v => props.setActiveTool(v as EditorTool)}
                    isToolbar
                    options={[
                        {value: 'select', label: 'Select', icon: 'select'}, 
                        {value: 'add', label: 'Add', icon: 'add'}, 
                        {value: 'connect', label: 'Connect', icon: 'connect'}, 
                        {value: 'delete', label: 'Delete', icon: 'delete'}
                    ]}
                />
                <NodeTypePalette activePointType={props.activePointType} setActivePointType={props.setActivePointType} disabled={props.activeTool !== 'add'} />
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <button onClick={props.onRemoveLastNode} className={`${buttonStyles.base} ${buttonStyles.tertiary}`}>
                        <Icon name="undo" className="h-4 w-4" /><span>Undo Node</span>
                    </button>
                    <button onClick={props.onRemoveLastEdge} className={`${buttonStyles.base} ${buttonStyles.tertiary}`}>
                        <Icon name="undo" className="h-4 w-4" /><span>Undo Edge</span>
                    </button>
                </div>
            </StepSection>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={props.onBack} className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
                    Back to Setup
                </button>
                 <button onClick={props.onNext} className={`${buttonStyles.base} ${buttonStyles.primary}`}>
                    Finalize & Define Routes
                </button>
            </div>
        </div>
    );
};

const RoutingStep: React.FC<ManualControlsProps & { onBack: () => void }> = (props) => {
    const { 
        sourceEdges, selectedEdgeKeys, onUpdateSelectedEdgeProps,
        routes, onCreateRoute, onDeleteRoute, highlightedRouteId, setHighlightedRouteId,
        onDownloadJson
    } = props;

    const [routeName, setRouteName] = useState('');
    const [routePurpose, setRoutePurpose] = useState('');

    const selectedEdge = useMemo(() => {
        if (selectedEdgeKeys.size !== 1) return null;
        const key = selectedEdgeKeys.values().next().value;
        return sourceEdges.find(p => makeEdgeKey(p.from, p.to) === key) || null;
    }, [selectedEdgeKeys, sourceEdges]);
    
    const handleCreateRouteClick = () => {
        onCreateRoute(routeName, routePurpose);
        setRouteName('');
        setRoutePurpose('');
    };

    return (
        <div className="space-y-6">
             <StepSection title="Step 3: Define Routes & Export" info="Hold Shift and click to select multiple edges to define a strategic route. When you're done, download the map data.">
                 {selectedEdgeKeys.size === 0 && <p className="text-sm text-gray-400">Select an edge to edit its properties, or hold Shift to select multiple edges to create a route.</p>}
                    {selectedEdge && (
                        <>
                           <RadioGroup label="Edge Type" value={selectedEdge.type || 'walkable'} onChange={v => onUpdateSelectedEdgeProps({ type: v as EdgeType })} options={[{value: 'walkable', label: 'Walkable'}, {value: 'bridgeable', label: 'Bridgeable'}]} />
                           <TextInput label="Edge Purpose" value={selectedEdge.purpose || ''} onChange={v => onUpdateSelectedEdgeProps({ purpose: v })} placeholder="e.g., Main push, Flank..." />
                        </>
                    )}
                    {selectedEdgeKeys.size > 1 && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-300 font-medium">{selectedEdgeKeys.size} edges selected.</p>
                            <TextInput label="Route Name" value={routeName} onChange={setRouteName} placeholder="e.g., Blue Left Flank" />
                            <TextInput label="Route Purpose" value={routePurpose} onChange={setRoutePurpose} placeholder="e.g., Rush to top wool" />
                            <button onClick={handleCreateRouteClick} className={`${buttonStyles.base} ${buttonStyles.primary}`}>
                                <span>Create Route</span>
                            </button>
                        </div>
                    )}
             </StepSection>
             <StepSection title="Saved Routes" info="Review, highlight, or delete the routes you have defined for your map.">
                {routes.length === 0 ? <p className="text-sm text-gray-400">No routes defined yet.</p> : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                        {routes.map(route => (
                            <li key={route.id} className={`p-2 rounded-md transition-colors ${highlightedRouteId === route.id ? 'bg-gray-600' : 'bg-gray-800/50'}`}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-200 text-sm">{route.name}</p>
                                        <p className="text-xs text-gray-400">{route.purpose}</p>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button title="Highlight Route" onClick={() => setHighlightedRouteId(highlightedRouteId === route.id ? null : route.id)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md">
                                            <Icon name="eye" className="h-4 w-4" />
                                        </button>
                                        <button title="Delete Route" onClick={() => onDeleteRoute(route.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-md">
                                            <Icon name="trash" className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
             </StepSection>
             <div className="grid grid-cols-2 gap-2">
                <button onClick={props.onBack} className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
                    Back to Placement
                </button>
                 <button onClick={onDownloadJson} className={`${buttonStyles.base} ${buttonStyles.primary}`}>
                    <Icon name="download" className="h-4 w-4" /><span>Download JSON</span>
                </button>
            </div>
        </div>
    );
};


const ManualControls: React.FC<ManualControlsProps> = (props) => {
    const { vizOptions, setVizOptions, setActiveTool } = props;
    const [currentStep, setCurrentStep] = useState(1);
    
    const handleClearAndReset = () => {
        props.onClearCanvas();
        setCurrentStep(1);
    };

    const goToNextStep = () => setCurrentStep(s => Math.min(s + 1, 3));
    const goToPrevStep = () => setCurrentStep(s => Math.max(s - 1, 1));
    
    useEffect(() => {
        if (currentStep === 2) {
            setActiveTool('add');
        } else if (currentStep === 3) {
            setActiveTool('select');
        }
    }, [currentStep, setActiveTool]);

    const handleVizChange = <K extends keyof VisualizationOptions,>(key: K, value: VisualizationOptions[K]) => {
        setVizOptions(prev => ({...prev, [key]: value}));
    };

    const allPropsWithNavigation = {
        ...props,
        onClearCanvas: handleClearAndReset,
        onNext: goToNextStep,
        onBack: goToPrevStep,
    };

    return (
        <div className="flex flex-col h-full">
            <header className="shrink-0 px-6 pt-6 pb-4">
                 <h1 className="text-2xl font-bold text-white mb-4">Manual Editor</h1>
                 <StepIndicator currentStep={currentStep} />
            </header>

            <div className="flex-grow overflow-y-auto px-6 pb-6">
                {currentStep === 1 && <SetupStep {...allPropsWithNavigation} />}
                {currentStep === 2 && <PlacementStep {...allPropsWithNavigation} />}
                {currentStep === 3 && <RoutingStep {...allPropsWithNavigation} />}
            </div>

            <footer className="shrink-0 border-t border-gray-700">
                 <Accordion title="Visualization">
                     <ToggleSwitch label="Show Path Lengths" checked={vizOptions.showPathLengths} onChange={(v) => handleVizChange('showPathLengths', v)} />
                </Accordion>
            </footer>
        </div>
    );
};

export default ManualControls;
