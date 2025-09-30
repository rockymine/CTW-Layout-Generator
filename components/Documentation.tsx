import React from 'react';

const DocSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-4">
        <h3 className="text-lg font-semibold text-blue-300 mb-2">{title}</h3>
        <div className="text-gray-300 text-sm space-y-2">{children}</div>
    </div>
);

const PointType: React.FC<{ name: string, label: string, children: React.ReactNode }> = ({ name, label, children }) => (
    <div className="pl-4 border-l-2 border-gray-600 py-1">
        <h4 className="font-mono font-bold text-teal-300">{name} <span className="text-gray-400">({label})</span></h4>
        <div className="text-gray-400 text-xs leading-relaxed mt-1 space-y-1">{children}</div>
    </div>
);


const Documentation: React.FC = () => {
    return (
        <div className="space-y-4 pt-2">
            <h2 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">Layout Generation Process</h2>
            
            <DocSection title="1. Overview">
                <p>The generator creates balanced and tactically diverse Capture the Wool (CTW) maps. The process begins by defining a grid for one team's territory, placing strategic nodes within it, connecting them with edges, and finally applying a symmetry rule to generate the opposing team's layout.</p>
            </DocSection>

            <DocSection title="2. Core Concepts">
                <div>
                    <h4 className="font-bold text-gray-200">Grid System</h4>
                    <p>Each team's territory is divided into a 3x3 grid of zones. The <strong>Grid Mode</strong> setting controls how this grid is formed. <em>Standard</em> mode uses consistent column widths across all rows, creating a uniform layout. <em>Row-Independent</em> mode randomizes column widths for each row, leading to more irregular and unpredictable map shapes.</p>
                </div>
                 <div className="mt-2">
                    <h4 className="font-bold text-gray-200">Symmetry</h4>
                    <p>The opponent's map half is generated based on the selected <strong>Symmetry Mode</strong>. <em>Mirror</em> reflects the layout horizontally across the center gap. <em>Rotation</em> reflects it both horizontally and vertically, creating a 180-degree rotational symmetry.</p>
                </div>
            </DocSection>
            
            <DocSection title="3. Node Types & Placement Rules">
                <p>Each node type serves a specific strategic purpose and follows strict placement constraints to ensure a logical map flow.</p>
                <div className="space-y-3 mt-2">
                    <PointType name="SPAWN" label="S">
                        <p><strong>Description:</strong> The team's main respawn area.</p>
                        <p><strong>Placement:</strong> A single spawn is placed in the central-rear zone (row 1, col 0).</p>
                        <p><strong>Constraint:</strong> Must be located "behind" its corresponding Spawn Entry, making it a strategic dead-end.</p>
                    </PointType>
                    <PointType name="SPAWN ENTRY" label="SE">
                        <p><strong>Description:</strong> A mandatory chokepoint that must be passed through after spawning to reach the rest of the map.</p>
                        <p><strong>Placement:</strong> Placed within the same zone as the Spawn.</p>
                        <p><strong>Constraint:</strong> Positioned "in front of" the spawn room (closer to the map's center).</p>
                    </PointType>
                    <PointType name="WOOL" label="W">
                        <p><strong>Description:</strong> The primary objectives that the enemy team must capture.</p>
                        <p><strong>Placement:</strong> Placed in the top-rear (row 0, col 0) and bottom-rear (row 2, col 0) zones.</p>
                        <p><strong>Constraint:</strong> Must be located "behind" its corresponding Wool Entry, making it a strategic dead-end.</p>
                    </PointType>
                    <PointType name="WOOL ENTRY" label="WE">
                        <p><strong>Description:</strong> A mandatory chokepoint that must be passed through to reach a wool room.</p>
                        <p><strong>Placement:</strong> Placed within the same zone as its corresponding Wool.</p>
                        <p><strong>Constraint:</strong> Positioned "in front of" the wool room (closer to the map's center).</p>
                    </PointType>
                    <PointType name="HUB" label="HUB">
                        <p><strong>Description:</strong> Central routing nodes connecting different lanes and strategic areas. They form the backbone of the map's pathing.</p>
                        <p><strong>Placement:</strong> One HUB is placed in each of the three middle-column zones (col 1).</p>
                    </PointType>
                    <PointType name="FRONT LINE" label="FL">
                        <p><strong>Description:</strong> Forward objectives or points of interest in the zones closest to the center of the map.</p>
                        <p><strong>Placement:</strong> Placed in the front-column zones (col 2). Two or three are generated per team.</p>
                        <p><strong>Constraint:</strong> Must be located "behind" its corresponding Front Line Entry.</p>
                    </PointType>
                     <PointType name="FRONT LINE ENTRY" label="FE">
                        <p><strong>Description:</strong> A mandatory gateway to access a Front Line objective.</p>
                        <p><strong>Placement:</strong> Placed within the same zone as its corresponding Front Line node.</p>
                        <p><strong>Constraint:</strong> Positioned "in front of" the Front Line objective (closer to the team's HUBs).</p>
                    </PointType>
                    <PointType name="ISLAND" label="I">
                        <p><strong>Description:</strong> Small, optional nodes of interest forming short, bridgeable paths.</p>
                        <p><strong>Placement:</strong> Can spawn in various underutilized areas, such as empty frontline zones, the center gap, or a new "fourth column" area.</p>
                        <p><strong>Constraint:</strong> Generated near existing nodes to ensure they are accessible via bridging.</p>
                    </PointType>
                </div>
            </DocSection>

             <DocSection title="4. Edge Generation">
                <p>Edges are algorithmically generated to ensure logical flow and connectivity between nodes.</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
                    <li><strong>Spawn Pathing:</strong> The Spawn connects to its Spawn Entry, which then connects only to the middle HUB.</li>
                    <li><strong>Lane Pathing:</strong> Each Wool Entry and Frontline Entry connects to its single closest HUB, creating distinct lanes.</li>
                    <li><strong>Entries to Objectives:</strong> Each Entry node is connected directly to its corresponding objective (Wool or Front Line).</li>
                    <li><strong>Inter-Hub Links:</strong> HUBs are connected vertically to each other, allowing for lateral movement across lanes.</li>
                    <li><strong>Tactical Gaps:</strong> Edges connecting to islands, and 1-2 edges between a HUB and a Front Line Entry, are randomly marked as "gaps" (dashed lines), representing more difficult or unbridged paths.</li>
                </ul>
            </DocSection>

            <DocSection title="5. Island Generation">
                <p>To add variety, the generator can create small "islands" - chains of 2-3 minor nodes. These provide optional flanking routes and make the map more dynamic. You can control this feature in the "Island Generation" settings.</p>
                 <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
                    <li><strong>Max Islands:</strong> Controls the maximum number of island chains generated for each team's side of the map.</li>
                    <li><strong>Spawn Locations:</strong> You can choose where islands are allowed to spawn: in unused frontline zones, in a new "fourth column" just past the frontlines, or in the central void between the teams.</li>
                </ul>
            </DocSection>
        </div>
    );
};

export default Documentation;