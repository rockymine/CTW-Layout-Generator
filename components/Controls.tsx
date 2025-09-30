import React from 'react';
import { GeneratorConfig, SymmetryMode, GridMode, VisualizationOptions } from '../types';
import RangeSlider from './RangeSlider';

// --- Reusable UI Components ---

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
                <div className="px-4 pb-4 space-y-3">
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


interface ControlsProps {
    config: GeneratorConfig;
    setConfig: React.Dispatch<React.SetStateAction<GeneratorConfig>>;
    onRegenerate: () => void;
    onNewMap: () => void;
    vizOptions: VisualizationOptions;
    setVizOptions: React.Dispatch<React.SetStateAction<VisualizationOptions>>;
    onToggleDocumentation: () => void;
    onDownloadJson: () => void;
}

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

const SeedInput: React.FC<{ value: number; }> = ({ value }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value.toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-400 mb-1">Random Seed</label>
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    readOnly
                    value={value}
                    className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none w-full font-mono"
                />
                <button
                    onClick={handleCopy}
                    title="Copy Seed"
                    className="p-2 w-20 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors text-sm"
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
        </div>
    );
};


const SelectInput: React.FC<{ label: string; value: string; onChange: (val: string) => void; options: string[]; disabled?: boolean; disabledReason?: string }> = ({ label, value, onChange, options, disabled, disabledReason }) => (
    <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-400 mb-1">{label}</label>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                title={disabled ? disabledReason : undefined}
                className={`w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
    </div>
);

const RadioGroup: React.FC<{ label: string; value: string | number; options: {value: string | number, label: string}[]; onChange: (value: string | number) => void; disabled?: boolean }> = ({ label, value, options, onChange, disabled }) => (
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

const Controls: React.FC<ControlsProps> = ({ config, setConfig, onRegenerate, onNewMap, vizOptions, setVizOptions, onToggleDocumentation, onDownloadJson }) => {
    
    const handleConfigChange = <K extends keyof GeneratorConfig,>(key: K, value: GeneratorConfig[K]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleIslandConfigChange = <K extends keyof GeneratorConfig['islandGeneration']>(key: K, value: GeneratorConfig['islandGeneration'][K]) => {
        setConfig(prev => ({
            ...prev,
            islandGeneration: {
                ...prev.islandGeneration,
                [key]: value
            }
        }));
    };
     const handlePathingChange = <K extends keyof GeneratorConfig['pathingEnhancements']>(
        key: K, 
        value: GeneratorConfig['pathingEnhancements'][K]
    ) => {
        setConfig(prev => ({
            ...prev,
            pathingEnhancements: {
                ...prev.pathingEnhancements,
                [key]: value
            }
        }));
    };

    const handleVizChange = <K extends keyof VisualizationOptions,>(key: K, value: VisualizationOptions[K]) => {
        setVizOptions(prev => ({...prev, [key]: value}));
    };

    return (
        <div className="flex flex-col h-full">
            <header className="shrink-0 p-6 pb-2">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">CTW Map Generator</h1>
                    <button
                        onClick={onToggleDocumentation}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                        title={"Show Documentation & Coordinates"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>
            </header>
            
            <div className="flex-grow overflow-y-auto">
                <Accordion title="Map Type" defaultOpen>
                    <RadioGroup label="Number of Teams" value={config.numTeams} onChange={v => handleConfigChange('numTeams', Number(v))} options={[{value: 2, label: '2'}, {value: 4, label: '4'}]} />
                    {config.numTeams === 4 && (
                        <RadioGroup label="Wools Per Team" value={config.woolsPerTeam} onChange={v => handleConfigChange('woolsPerTeam', Number(v))} options={[{value: 1, label: '1'}, {value: 2, label: '2'}]} />
                    )}
                </Accordion>

                <Accordion title="Generation Settings" defaultOpen>
                    <div className="space-y-3">
                       {config.numTeams === 2 ? (
                            <>
                                <div className="grid grid-cols-3 gap-2">
                                    <NumberInput label="Team Width" value={config.teamWidth} onChange={(v) => handleConfigChange('teamWidth', v)} min={80} max={120} step={1} />
                                    <NumberInput label="Team Height" value={config.teamHeight} onChange={(v) => handleConfigChange('teamHeight', v)} min={100} max={200} step={1} />
                                    <NumberInput label="Team Gap" value={config.teamGap} onChange={(v) => handleConfigChange('teamGap', v)} min={12} max={40} step={1} />
                                </div>
                                 <NumberInput label="Lane Width" value={config.laneWidth} onChange={(v) => handleConfigChange('laneWidth', v)} min={8} max={16} step={1} />
                            </>
                        ) : (
                             <div className="grid grid-cols-2 gap-2">
                                <NumberInput label="Quadrant Size" value={config.teamWidth} onChange={(v) => { handleConfigChange('teamWidth', v); handleConfigChange('teamHeight', v); }} min={100} max={200} step={1} />
                                <NumberInput label="Center Gap" value={config.teamGap} onChange={(v) => handleConfigChange('teamGap', v)} min={12} max={60} step={1} />
                                <NumberInput label="Lane Width" value={config.laneWidth} onChange={(v) => handleConfigChange('laneWidth', v)} min={8} max={16} step={1} />
                            </div>
                        )}
                        <SeedInput value={config.seed} />
                     </div>
                </Accordion>

                <Accordion title="Layout & Symmetry">
                     {config.numTeams === 2 && (
                        <>
                        <SelectInput
                            label="Grid Mode"
                            value={config.gridMode}
                            onChange={(v) => handleConfigChange('gridMode', v as GridMode)}
                            options={Object.values(GridMode)}
                            disabled={config.symmetricalTeamLayout}
                            disabledReason="Grid Mode is disabled because Symmetrical Team Layout requires a symmetrical grid."
                        />
                        <SelectInput label="Symmetry Mode" value={config.symmetryMode} onChange={(v) => handleConfigChange('symmetryMode', v as SymmetryMode)} options={Object.values(SymmetryMode)} />
                        <div className="pt-2 border-t border-gray-600/50">
                            <ToggleSwitch label="Symmetrical Team Layout" checked={config.symmetricalTeamLayout} onChange={(v) => handleConfigChange('symmetricalTeamLayout', v)} />
                        </div>
                        </>
                     )}
                     {config.numTeams === 4 && <p className="text-sm text-gray-400">4-team maps always use 90-degree rotational symmetry.</p>}
                </Accordion>

                <Accordion title="Distance Controls">
                    <RangeSlider
                        label="Spawn ↔ Entry"
                        value={config.spawnEntryDistance}
                        onChange={(v) => handleConfigChange('spawnEntryDistance', v)}
                        min={5} max={50} step={1}
                    />
                    <RangeSlider
                        label="Wool ↔ Entry"
                        value={config.woolEntryDistance}
                        onChange={(v) => handleConfigChange('woolEntryDistance', v)}
                        min={5} max={50} step={1}
                    />
                    <RangeSlider
                        label="Frontline ↔ Entry"
                        value={config.frontlineEntryDistance}
                        onChange={(v) => handleConfigChange('frontlineEntryDistance', v)}
                        min={5} max={50} step={1}
                    />
                </Accordion>

                {config.numTeams === 2 &&
                    <Accordion title="Pathing Enhancements">
                        <p className="text-xs text-gray-400">Add alternative routes to improve map flow.</p>
                        <ToggleSwitch label="Enable Wool Flank Routes" checked={config.pathingEnhancements.enableWoolFlankRoutes} onChange={(v) => handlePathingChange('enableWoolFlankRoutes', v)} />
                        <ToggleSwitch label="Enable Spawn-Wool Rush Route" checked={config.pathingEnhancements.enableSpawnWoolRushRoute} onChange={(v) => handlePathingChange('enableSpawnWoolRushRoute', v)} />
                    </Accordion>
                }

                <Accordion title="Island Generation">
                     <ToggleSwitch label="Enable Islands" checked={config.islandGeneration.enabled} onChange={(v) => handleIslandConfigChange('enabled', v)} />
                     {config.islandGeneration.enabled && (
                        <div className="space-y-4 pt-4 border-t border-gray-600/50">
                            <NumberInput label="Max Islands Per Team" value={config.islandGeneration.maxIslandsPerTeam} onChange={(v) => handleIslandConfigChange('maxIslandsPerTeam', v)} min={0} max={5} step={1} />
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 mb-1 block">Spawn Locations</label>
                                {config.numTeams === 2 && <ToggleSwitch label="In new forward column" checked={config.islandGeneration.spawnInFourthColumn} onChange={(v) => handleIslandConfigChange('spawnInFourthColumn', v)} />}
                                <ToggleSwitch label="In center gap" checked={config.islandGeneration.spawnInCenterGap} onChange={(v) => handleIslandConfigChange('spawnInCenterGap', v)} />
                                <ToggleSwitch label="In empty frontline zones" checked={config.islandGeneration.spawnInEmptyZones} onChange={(v) => handleIslandConfigChange('spawnInEmptyZones', v)} />
                            </div>
                        </div>
                     )}
                </Accordion>
            </div>

            <footer className="shrink-0 p-6 pt-4 border-t border-gray-700">
                <Accordion title="Visualization">
                    <ToggleSwitch label="Show Grid" checked={vizOptions.showGrid} onChange={(v) => handleVizChange('showGrid', v)} />
                    <ToggleSwitch label="Show Grid Cell Names" checked={vizOptions.showGridCellNames} onChange={(v) => handleVizChange('showGridCellNames', v)} />
                    <ToggleSwitch label="Show Lanes" checked={vizOptions.showLanes} onChange={(v) => handleVizChange('showLanes', v)} />
                    <ToggleSwitch label="Show Paths" checked={vizOptions.showPaths} onChange={(v) => handleVizChange('showPaths', v)} />
                    <ToggleSwitch label="Show Points" checked={vizOptions.showPoints} onChange={(v) => handleVizChange('showPoints', v)} />
                    <ToggleSwitch label="Show Path Lengths" checked={vizOptions.showPathLengths} onChange={(v) => handleVizChange('showPathLengths', v)} />
                </Accordion>

                <div className="flex flex-col space-y-2 mt-4">
                    <button
                        onClick={onRegenerate}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-base"
                    >
                        Regenerate Layout
                    </button>
                    <div className="flex space-x-2">
                        <button
                            onClick={onNewMap}
                            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                        >
                            New Map
                        </button>
                        <button
                            onClick={onDownloadJson}
                            className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                        >
                            Download JSON
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Controls;