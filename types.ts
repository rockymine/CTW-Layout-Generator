export interface Point {
    x: number;
    y: number;
}

export interface Zone {
    x: number;

    y: number;
    width: number;
    height: number;
    row: number;
    col: number;
}

export enum StrategicPointType {
    WOOL = 'W',
    WOOL_ENTRY = 'WE',
    SPAWN = 'S',
    SPAWN_ENTRY = 'SE',
    FRONT_LINE = 'FL',
    FRONT_LINE_ENTRY = 'FE',
    HUB = 'HUB',
    ISLAND = 'I',
    HELPER = 'HELPER',
    CENTER_HUB = 'CH',
}

export const NODE_TYPE_ABBREVIATIONS: Record<StrategicPointType, string> = {
    [StrategicPointType.SPAWN]: 'SPAWN',
    [StrategicPointType.SPAWN_ENTRY]: 'S_EXIT',
    [StrategicPointType.WOOL]: 'WOOL',
    [StrategicPointType.WOOL_ENTRY]: 'W_ENTRY',
    [StrategicPointType.FRONT_LINE]: 'FRNT',
    [StrategicPointType.FRONT_LINE_ENTRY]: 'F_ENTRY',
    [StrategicPointType.HUB]: 'HUB',
    [StrategicPointType.HELPER]: 'HLPR',
    [StrategicPointType.ISLAND]: 'ISLE',
    [StrategicPointType.CENTER_HUB]: 'C_HUB',
};

export enum Team {
    BLUE = 'BLUE',
    ORANGE = 'ORANGE',
    GREEN = 'GREEN',
    YELLOW = 'YELLOW',
}

export interface Node {
    id: string;
    type: StrategicPointType;
    pos: Point;
    team: Team;
}

export type EdgeType = 'walkable' | 'bridgeable';

export interface Edge {
    from: string;
    to: string;
    nodes: Point[];
    isRushRoute?: boolean;
    isCrossTeam?: boolean;
    type?: EdgeType;
    purpose?: string;
}

export interface TeamLayout {
    grid: Zone[][];
    nodes: Node[];
    edges: Edge[];
}

export interface MapLayout {
    width: number;
    height: number;
    teamGap: number; // Used for 2-team gap or 4-team center area size
    laneWidth: number;
    teams: {
        [key in Team]?: TeamLayout;
    };
}


export enum SymmetryMode {
    MIRROR = 'Mirror',
    ROTATION = 'Rotation',
}

export enum GridMode {
    STANDARD = 'Standard',
    ROW_INDEPENDENT = 'Row-Independent',
}

export interface DistanceConstraint {
    min: number;
    max: number;
}

export interface IslandGenerationConfig {
    enabled: boolean;
    maxIslandsPerTeam: number;
    spawnInFourthColumn: boolean; // 2-team only
    spawnInCenterGap: boolean;
    spawnInEmptyZones: boolean;
}

export interface PathingEnhancements {
    enableWoolFlankRoutes: boolean;
    enableSpawnWoolRushRoute: boolean;
}

export interface GeneratorConfig {
    teamWidth: number;
    teamHeight: number;
    teamGap: number;
    laneWidth: number,
    seed: number;
    gridMode: GridMode;
    symmetryMode: SymmetryMode;
    symmetricalTeamLayout: boolean;
    spawnEntryDistance: DistanceConstraint;
    woolEntryDistance: DistanceConstraint;
    frontlineEntryDistance: DistanceConstraint;
    islandGeneration: IslandGenerationConfig;
    pathingEnhancements: PathingEnhancements;
    numTeams: number;
    woolsPerTeam: number;
}

export interface VisualizationOptions {
    showGrid: boolean;
    showPoints: boolean;
    showPaths: boolean;
    showLanes: boolean;
    showCoordinates: boolean;
    showPathLengths: boolean;
    showGridCellNames: boolean;
}

// Types for Manual Editor
export type EditorTool = 'select' | 'add' | 'connect' | 'delete';
export type MapScope = 'full' | 'half';
export enum TeamMirrorAxis {
    NONE = 'None',
    HORIZONTAL = 'Horizontal', // mirror top/bottom
}

export interface BackgroundImage {
    src: string;
    x: number;
    y: number;
    scale: number;
    opacity: number;
    width: number;
    height: number;
}

export interface Route {
    id: string;
    name: string;
    purpose: string;
    edgeKeys: string[];
}