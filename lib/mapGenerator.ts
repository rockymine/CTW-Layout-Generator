import { Point, Zone, Node, StrategicPointType, Edge, MapLayout, GeneratorConfig, GridMode, SymmetryMode, Team, DistanceConstraint, TeamLayout, NODE_TYPE_ABBREVIATIONS } from '../types';

// A simple Linear Congruential Generator for seeded random numbers
class PRNG {
    private seed: number;
    constructor(seed: number) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }
    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
    nextInt(min: number, max: number) {
        if (min > max) return min;
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    shuffle<T,>(array: T[]): T[] {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(this.next() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }
}

const generateNodeId = (counters: Map<string, number>, team: Team, type: StrategicPointType): string => {
    const key = `${team}-${type}`;
    const index = (counters.get(key) || 0) + 1;
    counters.set(key, index);
    const abbr = NODE_TYPE_ABBREVIATIONS[type];
    return `${team}-${abbr}-${index}`;
};

function placePairedPoints(
    prng: PRNG,
    zone: Zone,
    distance: DistanceConstraint,
    padding: number = 10
): { objective: Point, entry: Point } {
    const objectiveMaxX = zone.x + zone.width - padding - distance.min;
    
    // Check if zone is wide enough for the minimum distance
    if (objectiveMaxX <= zone.x + padding) {
        // Fallback: place points at opposite ends of the zone.
        const objective = {
            x: zone.x + padding,
            y: prng.nextInt(zone.y + padding, zone.y + zone.height - padding),
        };
        const entry = {
            x: zone.x + zone.width - padding,
            y: prng.nextInt(zone.y + padding, zone.y + zone.height - padding),
        };
        return { objective, entry };
    }

    const objective = {
        x: prng.nextInt(zone.x + padding, objectiveMaxX),
        y: prng.nextInt(zone.y + padding, zone.y + zone.height - padding),
    };

    const entryMinX = objective.x + distance.min;
    const entryMaxX = objective.x + distance.max;

    const clampedMinX = Math.max(entryMinX, zone.x + padding);
    const clampedMaxX = Math.min(entryMaxX, zone.x + zone.width - padding);

    if (clampedMinX >= clampedMaxX) {
        // Fallback if calculated range is invalid (should be rare)
        const entry = {
            x: zone.x + zone.width - padding,
            y: prng.nextInt(zone.y + padding, zone.y + zone.height - padding),
        };
        return { objective, entry };
    }

    const entry = {
        x: prng.nextInt(clampedMinX, clampedMaxX),
        y: prng.nextInt(zone.y + padding, zone.y + zone.height - padding),
    };

    return { objective, entry };
}


function pickCuts(prng: PRNG, totalSize: number, numCuts: number, minCellSize: number): number[] {
    const cuts: number[] = [];
    let availableSize = totalSize - minCellSize * (numCuts + 1);
    if (availableSize < 0) {
        throw new Error(`Cannot fit cells with min size ${minCellSize} into total size ${totalSize}.`);
    }

    const randomValues: number[] = [];
    for (let i = 0; i < numCuts; i++) {
        randomValues.push(prng.next());
    }
    const sum = randomValues.reduce((a, b) => a + b, 0);
    const proportions = randomValues.map(v => v / sum);

    let lastCut = 0;
    for (let i = 0; i < numCuts; i++) {
        const cut = lastCut + minCellSize + proportions[i] * availableSize;
        cuts.push(cut);
        lastCut = cut;
    }
    return cuts;
}

function createGrid(prng: PRNG, width: number, height: number, gridMode: GridMode, symmetricalTeamLayout: boolean): Zone[][] {
    const minCellWidth = 20;
    const minCellHeight = 20;

    let hCuts: number[];
    let rowHeights: number[];

    if (symmetricalTeamLayout) {
        // Enforce symmetrical rows
        const maxTopRowHeight = Math.floor((height - minCellHeight) / 2);
        if (minCellHeight > maxTopRowHeight) {
            throw new Error(`Cannot create symmetrical grid. Map height ${height} is too small for the minimum cell height of ${minCellHeight}.`);
        }
        const topRowHeight = prng.nextInt(minCellHeight, maxTopRowHeight);
        hCuts = [topRowHeight, height - topRowHeight];
        rowHeights = [hCuts[0], hCuts[1] - hCuts[0], height - hCuts[1]];
    } else {
        hCuts = pickCuts(prng, height, 2, minCellHeight);
        rowHeights = [hCuts[0], hCuts[1] - hCuts[0], height - hCuts[1]];
    }
    
    const vCuts = pickCuts(prng, width, 2, minCellWidth);

    const grid: Zone[][] = Array(3).fill(null).map(() => Array(3).fill(null));

    let y = 0;
    for (let i = 0; i < 3; i++) {
        let x = 0;
        // When symmetrical team layout is on, Row-Independent mode is disabled to maintain column consistency for mirroring.
        const useRowIndependentCuts = gridMode === GridMode.ROW_INDEPENDENT && !symmetricalTeamLayout;
        const finalVCuts = useRowIndependentCuts ? pickCuts(prng, width, 2, minCellWidth) : vCuts;
        const finalColWidths = [finalVCuts[0], finalVCuts[1] - finalVCuts[0], width - finalVCuts[1]];

        for (let j = 0; j < 3; j++) {
            grid[i][j] = {
                x: x, y: y,
                width: finalColWidths[j],
                height: rowHeights[i],
                row: i, col: j
            };
            x += finalColWidths[j];
        }
        y += rowHeights[i];
    }
    return grid;
}

function placePointsInZone(prng: PRNG, zone: Zone, count: number, padding: number = 5): Point[] {
    const points: Point[] = [];
    for (let i = 0; i < count; i++) {
        points.push({
            x: zone.x + prng.nextInt(padding, zone.width - padding),
            y: zone.y + prng.nextInt(padding, zone.height - padding)
        });
    }
    return points;
}

function placeNodes(prng: PRNG, grid: Zone[][], team: Team, config: GeneratorConfig, counters: Map<string, number>): Node[] {
    const { symmetricalTeamLayout, woolEntryDistance, spawnEntryDistance, frontlineEntryDistance } = config;

    if (!symmetricalTeamLayout) {
        const nodes: Node[] = [];

        // Place Woolrooms and their entries in the same zone.
        const woolZones = prng.shuffle([grid[0][0], grid[2][0]]);
        
        // First Wool
        const w1Zone = woolZones[0];
        const { objective: w1Pos, entry: w1EntryPos } = placePairedPoints(prng, w1Zone, woolEntryDistance, 10);
        nodes.push({ id: generateNodeId(counters, team, StrategicPointType.WOOL), type: StrategicPointType.WOOL, pos: w1Pos, team });
        nodes.push({ id: generateNodeId(counters, team, StrategicPointType.WOOL_ENTRY), type: StrategicPointType.WOOL_ENTRY, pos: w1EntryPos, team });

        // Second Wool
        const w2Zone = woolZones[1];
        const { objective: w2Pos, entry: w2EntryPos } = placePairedPoints(prng, w2Zone, woolEntryDistance, 10);
        nodes.push({ id: generateNodeId(counters, team, StrategicPointType.WOOL), type: StrategicPointType.WOOL, pos: w2Pos, team });
        nodes.push({ id: generateNodeId(counters, team, StrategicPointType.WOOL_ENTRY), type: StrategicPointType.WOOL_ENTRY, pos: w2EntryPos, team });

        // Place Spawn and its entry
        const spawnZone = grid[1][0];
        const { objective: spawnPos, entry: spawnEntryPos } = placePairedPoints(prng, spawnZone, spawnEntryDistance, 10);
        nodes.push({ id: generateNodeId(counters, team, StrategicPointType.SPAWN), type: StrategicPointType.SPAWN, pos: spawnPos, team });
        nodes.push({ id: generateNodeId(counters, team, StrategicPointType.SPAWN_ENTRY), type: StrategicPointType.SPAWN_ENTRY, pos: spawnEntryPos, team });

        // Place Hubs
        for (let i = 0; i < 3; i++) {
            const hubPos = placePointsInZone(prng, grid[i][1], 1, 10)[0];
            nodes.push({ id: generateNodeId(counters, team, StrategicPointType.HUB), type: StrategicPointType.HUB, pos: hubPos, team });
        }

        // Place Frontlines
        const frontlineZoneIndices = prng.shuffle([0, 1, 2]).slice(0, prng.nextInt(2, 3));
        for (const i of frontlineZoneIndices) {
            const zone = grid[i][2];
            // For Frontlines, the Entry (FE) is closer to spawn (smaller x) and the objective (FL) is closer to the center gap (larger x).
            // Our helper returns objective (smaller x) and entry (larger x), so the naming is swapped here.
            const { objective: fePos, entry: flPos } = placePairedPoints(prng, zone, frontlineEntryDistance, 10);
            nodes.push({ id: generateNodeId(counters, team, StrategicPointType.FRONT_LINE_ENTRY), type: StrategicPointType.FRONT_LINE_ENTRY, pos: fePos, team });
            nodes.push({ id: generateNodeId(counters, team, StrategicPointType.FRONT_LINE), type: StrategicPointType.FRONT_LINE, pos: flPos, team });
        }

        return nodes;
    }

    // Symmetrical team layout logic
    const nodes: Node[] = [];

    // 1. Place Spawn and Spawn Entry on the horizontal axis to define the mirror line.
    const spawnZone = grid[1][0];
    const mirrorY = spawnZone.y + prng.nextInt(10, spawnZone.height - 10); // The mirror axis
    
    const { objective: spawnPosRaw, entry: spawnEntryPosRaw } = placePairedPoints(prng, spawnZone, spawnEntryDistance, 10);
    const spawnPos = { ...spawnPosRaw, y: mirrorY };
    const spawnEntryPos = { ...spawnEntryPosRaw, y: mirrorY };

    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.SPAWN), type: StrategicPointType.SPAWN, pos: spawnPos, team });
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.SPAWN_ENTRY), type: StrategicPointType.SPAWN_ENTRY, pos: spawnEntryPos, team });

    const mirrorPoint = (p: Point): Point => ({ x: p.x, y: 2 * mirrorY - p.y });

    // 2. Place Top Wool and Entry, then mirror for Bottom Wool
    const w1Zone = grid[0][0];
    const { objective: w1Pos, entry: w1EntryPos } = placePairedPoints(prng, w1Zone, woolEntryDistance, 10);
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.WOOL), type: StrategicPointType.WOOL, pos: w1Pos, team });
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.WOOL_ENTRY), type: StrategicPointType.WOOL_ENTRY, pos: w1EntryPos, team });
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.WOOL), type: StrategicPointType.WOOL, pos: mirrorPoint(w1Pos), team });
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.WOOL_ENTRY), type: StrategicPointType.WOOL_ENTRY, pos: mirrorPoint(w1EntryPos), team });
    
    // 3. Place Hubs (Top, Middle on axis, Bottom mirrored)
    const topHubPos = placePointsInZone(prng, grid[0][1], 1, 10)[0];
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.HUB), type: StrategicPointType.HUB, pos: topHubPos, team });
    const midHubPos = { x: grid[1][1].x + prng.nextInt(10, grid[1][1].width - 10), y: mirrorY };
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.HUB), type: StrategicPointType.HUB, pos: midHubPos, team });
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.HUB), type: StrategicPointType.HUB, pos: mirrorPoint(topHubPos), team });

    // 4. Place Top Frontline, then mirror for Bottom Frontline
    const topFlZone = grid[0][2];
    const { objective: fePos, entry: flPos } = placePairedPoints(prng, topFlZone, frontlineEntryDistance, 10);
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.FRONT_LINE_ENTRY), type: StrategicPointType.FRONT_LINE_ENTRY, pos: fePos, team });
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.FRONT_LINE), type: StrategicPointType.FRONT_LINE, pos: flPos, team });
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.FRONT_LINE_ENTRY), type: StrategicPointType.FRONT_LINE_ENTRY, pos: mirrorPoint(fePos), team });
    nodes.push({ id: generateNodeId(counters, team, StrategicPointType.FRONT_LINE), type: StrategicPointType.FRONT_LINE, pos: mirrorPoint(flPos), team });

    return nodes;
}

function findNode(nodes: Node[], type: StrategicPointType): Node | undefined {
    return nodes.find(p => p.type === type);
}

function findNodes(nodes: Node[], type: StrategicPointType): Node[] {
    return nodes.filter(p => p.type === type);
}

function createEdges(nodes: Node[], prng: PRNG): Edge[] {
    const edges: Edge[] = [];
    const spawn = findNode(nodes, StrategicPointType.SPAWN)!;
    const spawnEntry = findNode(nodes, StrategicPointType.SPAWN_ENTRY)!;
    const wools = findNodes(nodes, StrategicPointType.WOOL);
    const woolEntries = findNodes(nodes, StrategicPointType.WOOL_ENTRY);
    const hubs = findNodes(nodes, StrategicPointType.HUB);
    const frontEntries = findNodes(nodes, StrategicPointType.FRONT_LINE_ENTRY);
    const frontlines = findNodes(nodes, StrategicPointType.FRONT_LINE);
    
    // Connect spawn to its entry
    edges.push({ from: spawn.id, to: spawnEntry.id, nodes: [spawn.pos, spawnEntry.pos], type: 'walkable'});

    const sortedHubs = hubs.sort((a,b) => a.pos.y - b.pos.y);
    const midHub = sortedHubs.length > 1 ? sortedHubs[Math.floor(sortedHubs.length / 2)] : sortedHubs[0];

    // Connect spawn entry ONLY to the middle hub to create a main "street"
    if (midHub) {
        edges.push({ from: spawnEntry.id, to: midHub.id, nodes: [spawnEntry.pos, midHub.pos], type: 'walkable'});
    }

    // Connect Wool Entries to Wools and their SINGLE closest Hub
    wools.forEach(wool => {
        if (!woolEntries.length || !hubs.length) return;
        // Find the specific wool entry that is physically closest to this wool
        const entry = woolEntries.reduce((prev, curr) => 
            Math.hypot(curr.pos.x - wool.pos.x, curr.pos.y - wool.pos.y) < Math.hypot(prev.pos.x - wool.pos.x, prev.pos.y - wool.pos.y) ? curr : prev
        );
        // Find the single closest hub to that entry
        const hub = hubs.reduce((prev, curr) => 
            Math.hypot(curr.pos.x - entry.pos.x, curr.pos.y - entry.pos.y) < Math.hypot(prev.pos.x - entry.pos.x, prev.pos.y - entry.pos.y) ? curr : prev
        );
        edges.push({ from: hub.id, to: entry.id, nodes: [hub.pos, entry.pos], type: 'walkable' });
        edges.push({ from: entry.id, to: wool.id, nodes: [entry.pos, wool.pos], type: 'walkable' });
    });

    // Connect each Frontline Entry to its SINGLE closest Hub
    if (hubs.length > 0) {
        frontEntries.forEach(fe => {
            const closestHub = hubs.reduce((prev, curr) => 
                Math.hypot(curr.pos.x - fe.pos.x, curr.pos.y - fe.pos.y) < Math.hypot(prev.pos.x - fe.pos.x, prev.pos.y - fe.pos.y) ? curr : prev
            );
            edges.push({ from: closestHub.id, to: fe.id, nodes: [closestHub.pos, fe.pos], type: 'walkable' });
        });
    }
    
    // Inter-Hub connectivity for lane switching
    for(let i = 0; i < sortedHubs.length - 1; i++) {
        edges.push({ from: sortedHubs[i].id, to: sortedHubs[i+1].id, nodes: [sortedHubs[i].pos, sortedHubs[i+1].pos], type: 'walkable' });
    }

    // Frontline entry to objective connectivity
    if (frontlines.length > 0) {
        frontEntries.forEach(fe => {
            // Find the corresponding FL. Assume it's the closest one.
            const fl = frontlines.reduce((prev, curr) => 
                Math.hypot(curr.pos.x - fe.pos.x, curr.pos.y - fe.pos.y) < Math.hypot(prev.pos.x - fe.pos.x, prev.pos.y - fe.pos.y) ? curr : prev
            );
            edges.push({ from: fe.id, to: fl.id, nodes: [fe.pos, fl.pos], type: 'walkable' });
        });
    }

    // Add 1-2 tactical gaps
    const potentialGapEdges = edges.filter(p => p.from.includes('HUB') && p.to.includes('F_ENTRY'));
    if (potentialGapEdges.length > 0) {
      const edgesToGap = prng.shuffle(potentialGapEdges).slice(0, prng.nextInt(1, 2));
      edgesToGap.forEach(p => {
        p.type = 'bridgeable';
      });
    }

    return edges;
}

function addPathingEnhancements(
    nodes: Node[],
    edges: Edge[],
    config: GeneratorConfig,
    prng: PRNG,
    team: Team,
    counters: Map<string, number>
): { nodes: Node[], edges: Edge[] } {
    let newNodes = [...nodes];
    let newEdges = [...edges];
    const { pathingEnhancements, teamHeight } = config;
    const flankDiversionPoints = new Map<string, Node>();

    if (pathingEnhancements.enableWoolFlankRoutes) {
        const woolEntries = findNodes(newNodes, StrategicPointType.WOOL_ENTRY);
        const hubs = findNodes(newNodes, StrategicPointType.HUB);
        const wools = findNodes(newNodes, StrategicPointType.WOOL);

        const hubIds = new Set(hubs.map(p => p.id));
        const woolIds = new Set(wools.map(p => p.id));
        
        for (const we of woolEntries) {
            const hubToWEEdge = newEdges.find(p => p.to === we.id && hubIds.has(p.from));
            const weToWoolEdge = newEdges.find(p => p.from === we.id && woolIds.has(p.to));

            if (hubToWEEdge && weToWoolEdge) {
                const hub = newNodes.find(p => p.id === hubToWEEdge.from)!;
                const wool = newNodes.find(p => p.id === weToWoolEdge.to)!;
                
                newEdges = newEdges.filter(p => p !== hubToWEEdge && p !== weToWoolEdge);
                
                const p1Pos = { x: hub.pos.x + (we.pos.x - hub.pos.x) * 0.5, y: hub.pos.y + (we.pos.y - hub.pos.y) * 0.5 };
                const p2Pos = { x: we.pos.x + (wool.pos.x - we.pos.x) * 0.5, y: we.pos.y + (wool.pos.y - we.pos.y) * 0.5 };
                const flankOffset = prng.nextInt(0,1) === 0 ? 25 : -25;
                
                const padding = 10;
                let flankY = we.pos.y + flankOffset;
                flankY = Math.max(padding, Math.min(flankY, teamHeight - padding));

                const p3Pos = { x: we.pos.x, y: flankY };

                const p1: Node = { id: generateNodeId(counters, team, StrategicPointType.HELPER), type: StrategicPointType.HELPER, pos: p1Pos, team };
                const p2: Node = { id: generateNodeId(counters, team, StrategicPointType.HELPER), type: StrategicPointType.HELPER, pos: p2Pos, team };
                const p3: Node = { id: generateNodeId(counters, team, StrategicPointType.HELPER), type: StrategicPointType.HELPER, pos: p3Pos, team };
                newNodes.push(p1, p2, p3);
                flankDiversionPoints.set(we.id, p3);

                newEdges.push({ from: hub.id, to: p1.id, nodes: [hub.pos, p1.pos], type: 'walkable' });
                newEdges.push({ from: p1.id, to: we.id, nodes: [p1.pos, we.pos], type: 'walkable' });
                newEdges.push({ from: we.id, to: p2.id, nodes: [we.pos, p2.pos], type: 'walkable' });
                newEdges.push({ from: p2.id, to: wool.id, nodes: [p2.pos, wool.pos], type: 'walkable' });
                newEdges.push({ from: p1.id, to: p3.id, nodes: [p1.pos, p3.pos], type: 'walkable' });
                newEdges.push({ from: p3.id, to: p2.id, nodes: [p3.pos, p2.pos], type: 'walkable' });
            }
        }
    }
    
    if (pathingEnhancements.enableSpawnWoolRushRoute) {
        const spawnEntry = findNode(newNodes, StrategicPointType.SPAWN_ENTRY);
        const woolEntries = findNodes(newNodes, StrategicPointType.WOOL_ENTRY);
        if (spawnEntry && woolEntries.length > 0) {
            const closestWE = woolEntries.reduce((prev, curr) => 
                Math.hypot(curr.pos.x - spawnEntry.pos.x, curr.pos.y - spawnEntry.pos.y) < Math.hypot(prev.pos.x - spawnEntry.pos.x, prev.pos.y - spawnEntry.pos.y) ? curr : prev
            );
            
            let targetForRushRoute = closestWE;
            const flankDiversionPoint = flankDiversionPoints.get(closestWE.id);

            if (flankDiversionPoint) {
                const seY = spawnEntry.pos.y;
                const weY = closestWE.pos.y;
                const flankY = flankDiversionPoint.pos.y;
                
                const isBetween = (seY < flankY && flankY < weY) || (weY < flankY && flankY < seY);
                if (isBetween) {
                    targetForRushRoute = flankDiversionPoint;
                }
            }

            newEdges.push({ from: spawnEntry.id, to: targetForRushRoute.id, nodes: [spawnEntry.pos, targetForRushRoute.pos], isRushRoute: true, type: 'walkable' });
        }
    }

    return { nodes: newNodes, edges: newEdges };
}


function applySymmetry(nodes: Node[], edges: Edge[], team: Team, symmetryMode: SymmetryMode, totalWidth: number, totalHeight: number): { nodes: Node[], edges: Edge[] } {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeMap = new Map<string, string>();

    for (const p of nodes) {
        const idParts = p.id.split('-');
        idParts.shift(); // remove old team
        const newId = `${team}-${idParts.join('-')}`;
        nodeMap.set(p.id, newId);
        
        let newPos: Point;
        if (symmetryMode === SymmetryMode.MIRROR) {
            newPos = { x: totalWidth - p.pos.x, y: p.pos.y };
        } else { // ROTATION
            newPos = { x: totalWidth - p.pos.x, y: totalHeight - p.pos.y };
        }
        newNodes.push({ ...p, id: newId, pos: newPos, team });
    }

    for (const edge of edges) {
        newEdges.push({
            from: nodeMap.get(edge.from)!,
            to: nodeMap.get(edge.to)!,
            nodes: edge.nodes.map(node => {
                if (symmetryMode === SymmetryMode.MIRROR) {
                    return { x: totalWidth - node.x, y: node.y };
                } else { // ROTATION
                    return { x: totalWidth - node.x, y: totalHeight - node.y };
                }
            }),
            isRushRoute: edge.isRushRoute,
            type: edge.type,
            purpose: edge.purpose,
        });
    }
    return { nodes: newNodes, edges: newEdges };
}

function findNearestNode(targetPos: Point, candidates: Node[]): Node {
    return candidates.reduce((prev, curr) =>
        Math.hypot(curr.pos.x - targetPos.x, curr.pos.y - targetPos.y) < Math.hypot(prev.pos.x - targetPos.x, prev.pos.y - targetPos.y) ? curr : prev
    );
}

function createIslandChain(
    prng: PRNG,
    startPoint: Point,
    bounds: Zone,
    team: Team,
    counters: Map<string, number>
): { nodes: Node[], edges: Edge[] } {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const numPoints = prng.nextInt(2, 3);
    const chain: Point[] = [startPoint];

    for (let i = 1; i < numPoints; i++) {
        const prevPoint = chain[i - 1];
        const nextPoint = {
            x: prng.nextInt(Math.max(bounds.x, prevPoint.x - 20), Math.min(bounds.x + bounds.width, prevPoint.x + 20)),
            y: prng.nextInt(Math.max(bounds.y, prevPoint.y - 20), Math.min(bounds.y + bounds.height, prevPoint.y + 20)),
        };
        chain.push(nextPoint);
    }
    
    const strategicNodes: Node[] = chain.map(p => ({
        id: generateNodeId(counters, team, StrategicPointType.ISLAND),
        type: StrategicPointType.ISLAND,
        pos: p,
        team
    }));
    newNodes.push(...strategicNodes);

    for (let i = 0; i < strategicNodes.length - 1; i++) {
        newEdges.push({
            from: strategicNodes[i].id,
            to: strategicNodes[i + 1].id,
            nodes: [strategicNodes[i].pos, strategicNodes[i + 1].pos],
            type: 'walkable'
        });
    }

    return { nodes: newNodes, edges: newEdges };
}


function generateIslands(
    prng: PRNG,
    config: GeneratorConfig,
    grid: Zone[][],
    existingNodes: Node[],
    totalWidth: number,
    totalHeight: number,
    counters: Map<string, number>
): { nodes: Node[], edges: Edge[] } {
    const { islandGeneration } = config;
    if (!islandGeneration.enabled || islandGeneration.maxIslandsPerTeam === 0) {
        return { nodes: [], edges: [] };
    }

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let islandCount = 0;

    const availableSpawns: (() => boolean)[] = [];
    if (islandGeneration.spawnInEmptyZones) {
        availableSpawns.push(() => {
            const usedFrontlineRows = new Set(findNodes(existingNodes, StrategicPointType.FRONT_LINE).map(p => grid.flat().find(z => p.pos.y >= z.y && p.pos.y < z.y+z.height)?.row));
            const emptyFrontlineZones = [0, 1, 2].filter(i => !usedFrontlineRows.has(i)).map(i => grid[i][2]);
            if (emptyFrontlineZones.length === 0) return false;

            const zone = prng.shuffle(emptyFrontlineZones)[0];
            const nearestNode = findNearestNode({x: zone.x, y: zone.y + zone.height / 2}, existingNodes);
            const startPos = {
                x: zone.x + prng.nextInt(10, zone.width-10),
                y: zone.y + prng.nextInt(10, zone.height-10)
            };

            const island = createIslandChain(prng, startPos, zone, Team.BLUE, counters);
            newNodes.push(...island.nodes);
            newEdges.push(...island.edges);
            newEdges.push({ from: nearestNode.id, to: island.nodes[0].id, nodes: [nearestNode.pos, island.nodes[0].pos], type: 'bridgeable' });
            return true;
        });
    }
    if (islandGeneration.spawnInFourthColumn && config.numTeams === 2) { // Only for 2 teams
        availableSpawns.push(() => {
            const fourthColWidth = 30;
            const zone: Zone = { x: config.teamWidth, y: 0, width: fourthColWidth, height: totalHeight, row: -1, col: 3 };
            const relevantNodes = existingNodes.filter(p => p.type === StrategicPointType.FRONT_LINE || p.type === StrategicPointType.FRONT_LINE_ENTRY);
            if (relevantNodes.length === 0) return false;

            const nearestNode = prng.shuffle(relevantNodes)[0];
            const startPos = {
                x: nearestNode.pos.x + prng.nextInt(15, 25),
                y: nearestNode.pos.y + prng.nextInt(-10, 10),
            };

            const island = createIslandChain(prng, startPos, zone, Team.BLUE, counters);
            newNodes.push(...island.nodes);
            newEdges.push(...island.edges);
            newEdges.push({ from: nearestNode.id, to: island.nodes[0].id, nodes: [nearestNode.pos, island.nodes[0].pos], type: 'bridgeable' });
            return true;
        });
    }
    if (islandGeneration.spawnInCenterGap) {
        availableSpawns.push(() => {
            const blueSideGapWidth = config.teamGap / 2;
            const zone: Zone = { x: (totalWidth - config.teamGap) / 2, y: 0, width: blueSideGapWidth, height: totalHeight, row: -1, col: -1 };
            const relevantNodes = existingNodes.filter(p => p.type === StrategicPointType.FRONT_LINE);
            if (relevantNodes.length === 0) return false;

            const startY = prng.nextInt(20, totalHeight - 20);
            const startPos = {
                x: zone.x + prng.nextInt(5, zone.width - 5),
                y: startY
            };
            const nearestNode = findNearestNode(startPos, relevantNodes);

            const island = createIslandChain(prng, startPos, zone, Team.BLUE, counters);
            newNodes.push(...island.nodes);
            newEdges.push(...island.edges);
            newEdges.push({ from: nearestNode.id, to: island.nodes[0].id, nodes: [nearestNode.pos, island.nodes[0].pos], type: 'bridgeable' });
            return true;
        });
    }

    const shuffledSpawns = prng.shuffle(availableSpawns);
    while (islandCount < islandGeneration.maxIslandsPerTeam && shuffledSpawns.length > 0) {
        const spawnFn = shuffledSpawns.pop()!;
        if(spawnFn()) {
            islandCount++;
        }
    }

    return { nodes: newNodes, edges: newEdges };
}

function generate2TeamLayout(config: GeneratorConfig, prng: PRNG): MapLayout {
    const totalWidth = config.teamWidth * 2 + config.teamGap;
    const totalHeight = config.teamHeight;

    if (config.teamWidth < 80) {
        throw new Error(`Each team's territory must be at least 80 units wide. Your 'Team Width' is set to ${config.teamWidth}. Please increase it to allow enough space for point placement.`);
    }
    
    const counters = new Map<string, number>();

    // Generate Blue Team side
    const blueGrid = createGrid(prng, config.teamWidth, config.teamHeight, config.gridMode, config.symmetricalTeamLayout);
    const blueNodes = placeNodes(prng, blueGrid, Team.BLUE, config, counters);
    const blueEdges = createEdges(blueNodes, prng);

    const { nodes: enhancedBlueNodes, edges: enhancedBlueEdges } = addPathingEnhancements(blueNodes, blueEdges, config, prng, Team.BLUE, counters);
    const islandResults = generateIslands(prng, config, blueGrid, enhancedBlueNodes, totalWidth, totalHeight, counters);
    const finalBlueNodes = [...enhancedBlueNodes, ...islandResults.nodes];
    const finalBlueEdges = [...enhancedBlueEdges, ...islandResults.edges];

    // Generate Orange Team side via symmetry
    const { nodes: orangeNodes, edges: orangeEdges } = applySymmetry(finalBlueNodes, finalBlueEdges, Team.ORANGE, config.symmetryMode, totalWidth, totalHeight);
    
    const orangeGrid: Zone[][] = blueGrid.map(row => row.map(zone => {
         if (config.symmetryMode === SymmetryMode.MIRROR) {
            return { ...zone, x: totalWidth - (zone.x + zone.width) };
        } else { // ROTATION
            const newX = totalWidth - (zone.x + zone.width);
            const newY = totalHeight - (zone.y + zone.height);
            return { ...zone, x: newX, y: newY };
        }
    }));

    return {
        width: totalWidth,
        height: totalHeight,
        teamGap: config.teamGap,
        laneWidth: config.laneWidth,
        teams: {
            [Team.BLUE]: { grid: blueGrid, nodes: finalBlueNodes, edges: finalBlueEdges },
            [Team.ORANGE]: { grid: orangeGrid, nodes: orangeNodes, edges: orangeEdges },
        }
    };
}

function generate4TeamLayout(config: GeneratorConfig, prng: PRNG): MapLayout {
    const quadrantSize = config.teamWidth; // Use teamWidth as quadrant size for simplicity
    const centerGap = config.teamGap;
    const totalSize = quadrantSize * 2 + centerGap;
    const centerPoint = { x: totalSize / 2, y: totalSize / 2 };

    const blueGrid = createGrid(prng, quadrantSize, quadrantSize, GridMode.STANDARD, false);
    const counters = new Map<string, number>();

    // Place nodes in the Blue (top-left) quadrant
    const blueNodes: Node[] = [];

    // Spawn in the corner
    const spawnZone = blueGrid[0][0];
    const { objective: spawnPos, entry: spawnEntryPos } = placePairedPoints(prng, spawnZone, config.spawnEntryDistance, 10);
    blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.SPAWN), type: StrategicPointType.SPAWN, pos: spawnPos, team: Team.BLUE });
    blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.SPAWN_ENTRY), type: StrategicPointType.SPAWN_ENTRY, pos: spawnEntryPos, team: Team.BLUE });

    // Wools
    if (config.woolsPerTeam === 1) {
        const woolZone = blueGrid[0][1];
        const { objective: woolPos, entry: woolEntryPos } = placePairedPoints(prng, woolZone, config.woolEntryDistance, 10);
        blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.WOOL), type: StrategicPointType.WOOL, pos: woolPos, team: Team.BLUE });
        blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.WOOL_ENTRY), type: StrategicPointType.WOOL_ENTRY, pos: woolEntryPos, team: Team.BLUE });
    } else { // 2 wools
        const { objective: wtPos, entry: wtEntryPos } = placePairedPoints(prng, blueGrid[0][1], config.woolEntryDistance, 10);
        blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.WOOL), type: StrategicPointType.WOOL, pos: wtPos, team: Team.BLUE });
        blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.WOOL_ENTRY), type: StrategicPointType.WOOL_ENTRY, pos: wtEntryPos, team: Team.BLUE });

        const { objective: wbPos, entry: wbEntryPos } = placePairedPoints(prng, blueGrid[1][0], config.woolEntryDistance, 10);
        blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.WOOL), type: StrategicPointType.WOOL, pos: wbPos, team: Team.BLUE });
        blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.WOOL_ENTRY), type: StrategicPointType.WOOL_ENTRY, pos: wbEntryPos, team: Team.BLUE });
    }

    // Hubs
    [blueGrid[1][1], blueGrid[0][2], blueGrid[2][0], blueGrid[1][2], blueGrid[2][1]].forEach(zone => {
         blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.HUB), type: StrategicPointType.HUB, pos: placePointsInZone(prng, zone, 1, 10)[0], team: Team.BLUE });
    });

    // Frontlines
    const { objective: fePos, entry: flPos } = placePairedPoints(prng, blueGrid[2][2], config.frontlineEntryDistance, 10);
    blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.FRONT_LINE_ENTRY), type: StrategicPointType.FRONT_LINE_ENTRY, pos: fePos, team: Team.BLUE });
    blueNodes.push({ id: generateNodeId(counters, Team.BLUE, StrategicPointType.FRONT_LINE), type: StrategicPointType.FRONT_LINE, pos: flPos, team: Team.BLUE });

    // Edges
    const blueEdges = createEdges(blueNodes, prng);

    // Center Hubs
    const centerHubs: Node[] = [];
    for (let i = 0; i < 4; i++) {
        centerHubs.push({
            id: generateNodeId(counters, Team.BLUE, StrategicPointType.CENTER_HUB), // team doesn't matter, will be shared
            type: StrategicPointType.CENTER_HUB,
            team: Team.BLUE, // Placeholder team
            pos: {
                x: centerPoint.x + prng.nextInt(-centerGap / 3, centerGap / 3),
                y: centerPoint.y + prng.nextInt(-centerGap / 3, centerGap / 3)
            }
        });
    }
    const allBlueNodes = [...blueNodes, ...centerHubs];
    const frontlineNodes = findNodes(blueNodes, StrategicPointType.FRONT_LINE);
    frontlineNodes.forEach(fl => {
        const closestCenterHub = findNearestNode(fl.pos, centerHubs);
        blueEdges.push({ from: fl.id, to: closestCenterHub.id, nodes: [fl.pos, closestCenterHub.pos], type: 'walkable' });
    });


    const rotatePoint = (p: Point, angle: number, center: Point): Point => {
        const rad = angle * (Math.PI / 180);
        const translatedX = p.x - center.x;
        const translatedY = p.y - center.y;
        const rotatedX = translatedX * Math.cos(rad) - translatedY * Math.sin(rad);
        const rotatedY = translatedX * Math.sin(rad) + translatedY * Math.cos(rad);
        return { x: rotatedX + center.x, y: rotatedY + center.y };
    };
    
    const rotateLayout = (baseLayout: TeamLayout, angle: number, newTeam: Team): TeamLayout => {
        const newNodes: Node[] = [];
        const nodeMap = new Map<string, string>();
        
        baseLayout.nodes.forEach(p => {
             if (p.type === StrategicPointType.CENTER_HUB) {
                if (!nodeMap.has(p.id)) {
                    nodeMap.set(p.id, p.id);
                    newNodes.push(p);
                }
                return;
            }
            const idParts = p.id.split('-');
            const newId = `${newTeam}-${idParts[1]}-${idParts[2]}`;
            nodeMap.set(p.id, newId);
            newNodes.push({
                ...p,
                id: newId,
                team: newTeam,
                pos: rotatePoint(p.pos, angle, centerPoint)
            });
        });

        const newEdges = baseLayout.edges.map(edge => ({
            ...edge,
            from: nodeMap.get(edge.from)!,
            to: nodeMap.get(edge.to)!,
            nodes: edge.nodes.map(node => rotatePoint(node, angle, centerPoint)),
        }));

        const newGrid = baseLayout.grid.map(row => row.map(zone => {
            const { x, y, width, height } = zone;

            if (angle === 90) {
                const newTopLeft = rotatePoint({ x, y: y + height }, angle, centerPoint);
                return { ...zone, x: newTopLeft.x, y: newTopLeft.y, width: height, height: width };
            }
            if (angle === 180) {
                const newTopLeft = rotatePoint({ x: x + width, y: y + height }, angle, centerPoint);
                return { ...zone, x: newTopLeft.x, y: newTopLeft.y, width, height };
            }
            if (angle === 270) {
                const newTopLeft = rotatePoint({ x: x + width, y }, angle, centerPoint);
                return { ...zone, x: newTopLeft.x, y: newTopLeft.y, width: height, height: width };
            }
            
            return zone; // No rotation
        }));
        
        return { nodes: newNodes, edges: newEdges, grid: newGrid };
    };

    const blueTeamLayout: TeamLayout = { nodes: allBlueNodes, edges: blueEdges, grid: blueGrid };
    const orangeTeamLayout = rotateLayout(blueTeamLayout, 90, Team.ORANGE);
    const greenTeamLayout = rotateLayout(blueTeamLayout, 180, Team.GREEN);
    const yellowTeamLayout = rotateLayout(blueTeamLayout, 270, Team.YELLOW);

    return {
        width: totalSize,
        height: totalSize,
        teamGap: centerGap,
        laneWidth: config.laneWidth,
        teams: {
            [Team.BLUE]: blueTeamLayout,
            [Team.ORANGE]: orangeTeamLayout,
            [Team.GREEN]: greenTeamLayout,
            [Team.YELLOW]: yellowTeamLayout,
        }
    };
}


export function generateLayout(config: GeneratorConfig): MapLayout {
    const prng = new PRNG(config.seed);
    if (config.numTeams === 4) {
        return generate4TeamLayout(config, prng);
    }
    return generate2TeamLayout(config, prng);
}