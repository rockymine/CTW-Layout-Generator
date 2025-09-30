import React from 'react';
import { Node, Team } from '../types';
import { TEAM_COLORS } from './StrategicPointSymbol';


interface CoordinateDisplayProps {
    nodes: Node[];
}

const TEAM_NAMES: Record<Team, string> = {
    [Team.BLUE]: 'Blue Team',
    [Team.ORANGE]: 'Orange Team',
    [Team.GREEN]: 'Green Team',
    [Team.YELLOW]: 'Yellow Team',
};

const TEAM_TEXT_COLORS: Record<Team, string> = {
    [Team.BLUE]: 'text-blue-400',
    [Team.ORANGE]: 'text-orange-400',
    [Team.GREEN]: 'text-green-400',
    [Team.YELLOW]: 'text-yellow-400',
};


const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({ nodes }) => {
    
    const nodesByTeam = nodes.reduce<Record<string, Node[]>>((acc, p) => {
        if (!acc[p.team]) {
            acc[p.team] = [];
        }
        acc[p.team].push(p);
        return acc;
    }, {});

    Object.values(nodesByTeam).forEach(teamNodes => {
        teamNodes.sort((a, b) => a.id.localeCompare(b.id));
    });

    const teamOrder = [Team.BLUE, Team.ORANGE, Team.GREEN, Team.YELLOW];

    return (
        <div className="text-gray-200 pt-2">
            <h2 className="text-xl font-bold border-b border-gray-600 pb-2 mb-4">Node Coordinates</h2>
            <div className="space-y-4">
                {teamOrder.map(team => {
                    const teamNodes = nodesByTeam[team];
                    if (!teamNodes || teamNodes.length === 0) return null;
                    return (
                        <div key={team}>
                            <h3 className={`text-lg font-bold ${TEAM_TEXT_COLORS[team]} mb-2`}>{TEAM_NAMES[team]}</h3>
                            <ul className="space-y-1 text-sm font-mono">
                                {teamNodes.map(p => (
                                    <li key={p.id} className="flex justify-between items-baseline text-gray-300">
                                        <span className="text-xs mr-2">{p.id}</span>
                                        <span className="text-gray-100">({String(Math.round(p.pos.x)).padStart(3, ' ')}, {String(Math.round(p.pos.y)).padStart(3, ' ')})</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default CoordinateDisplay;