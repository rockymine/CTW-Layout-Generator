import React from 'react';
import { Node, StrategicPointType, Team } from '../types';

export const TEAM_COLORS: Record<Team, string> = {
    [Team.BLUE]: '#4285f4',
    [Team.ORANGE]: '#ff9800',
    [Team.GREEN]: '#0f9d58',
    [Team.YELLOW]: '#f4b400',
};

export const POINT_COLORS: Record<StrategicPointType, string> = {
    [StrategicPointType.WOOL]: '#dc3545',
    [StrategicPointType.SPAWN]: '#6c757d',
    [StrategicPointType.FRONT_LINE]: '#ffc107',
    [StrategicPointType.FRONT_LINE_ENTRY]: '#ffc107',
    [StrategicPointType.WOOL_ENTRY]: '#ffc107',
    [StrategicPointType.SPAWN_ENTRY]: '#ffc107',
    [StrategicPointType.HUB]: '#9e9e9e',
    [StrategicPointType.CENTER_HUB]: '#e0e0e0',
    [StrategicPointType.ISLAND]: '#9ca3af',
    [StrategicPointType.HELPER]: '#6b7280',
};

interface StrategicPointSymbolProps {
    node: Node,
    onClick?: (node: Node, event: React.MouseEvent) => void;
    isSelected?: boolean;
    opacity?: number;
    showLabel?: boolean;
}

const StrategicPointSymbol: React.FC<StrategicPointSymbolProps> = ({ node, onClick, isSelected, opacity = 1, showLabel }) => {
    const color = POINT_COLORS[node.type];
    const size = 6;
    const label = node.id;
    const { x, y } = node.pos;

    const getShape = () => {
        const sharedProps = {
            stroke: isSelected ? 'cyan' : 'white',
            strokeWidth: isSelected ? "1" : "0.5",
            onClick: (e: React.MouseEvent) => onClick?.(node, e),
            style: { cursor: onClick ? 'pointer' : 'default', opacity }
        };

        const shapeProps = { ...sharedProps, fill: color };

        switch (node.type) {
            case StrategicPointType.WOOL:
                return <rect x={x - size / 2} y={y - size / 2} width={size} height={size} {...shapeProps} />;
            case StrategicPointType.SPAWN:
                return <circle cx={x} cy={y} r={size / 2} {...shapeProps} />;
            case StrategicPointType.SPAWN_ENTRY: // Triangle pointing right
                return <path d={`M ${x - size/3} ${y - size/2} L ${x + size/2} ${y} L ${x - size/3} ${y + size/2} Z`} {...shapeProps} />;
            case StrategicPointType.WOOL_ENTRY: { // Pentagon
                const r = size / 2;
                const pathData = Array.from({ length: 5 }).map((_, i) => {
                    const angle_deg = 72 * i - 90;
                    const angle_rad = Math.PI / 180 * angle_deg;
                    return `${x + r * Math.cos(angle_rad)},${y + r * Math.sin(angle_rad)}`;
                }).join(' L ');
                return <path d={`M ${pathData} Z`} {...shapeProps} />;
            }
            case StrategicPointType.FRONT_LINE_ENTRY: // Diamond
                 return <path d={`M ${x} ${y - size/2} L ${x + size/2} ${y} L ${x} ${y + size/2} L ${x - size/2} ${y} Z`} {...shapeProps} />;
            case StrategicPointType.FRONT_LINE: { // Hexagon
                const r = size / 2;
                const pathData = Array.from({ length: 6 }).map((_, i) => {
                    const angle_deg = 60 * i - 90;
                    const angle_rad = Math.PI / 180 * angle_deg;
                    return `${x + r * Math.cos(angle_rad)},${y + r * Math.sin(angle_rad)}`;
                }).join(' L ');
                return <path d={`M ${pathData} Z`} {...shapeProps} />;
            }
            case StrategicPointType.HUB:
                return <circle cx={x} cy={y} r={size / 3} {...shapeProps} />;
            case StrategicPointType.CENTER_HUB:
                return <path d={`M ${x - size / 2.5} ${y - size/2.5} L ${x + size/2.5} ${y + size/2.5} M ${x - size/2.5} ${y + size/2.5} L ${x + size/2.5} ${y - size/2.5}`} stroke={color} strokeWidth="1" {...sharedProps} />;
            case StrategicPointType.ISLAND:
                return <rect x={x - size / 3} y={y - size / 3} width={size/1.5} height={size/1.5} {...shapeProps} />;
            case StrategicPointType.HELPER:
                return <path d={`M ${x - size/3} ${y} L ${x + size/3} ${y} M ${x} ${y - size/3} L ${x} ${y + size/3}`} stroke={color} strokeWidth="1" {...sharedProps} />;
            default:
                return null;
        }
    };

    return (
        <g aria-label={`${node.team} ${node.type} at ${Math.round(x)}, ${Math.round(y)}`} >
            {getShape()}
            {showLabel && node.type !== StrategicPointType.HELPER && (
                <text
                    x={x + size}
                    y={y}
                    fill="#cbd5e1"
                    fontSize="3.5"
                    fontFamily="sans-serif"
                    textAnchor="start"
                    alignmentBaseline="middle"
                    style={{ pointerEvents: 'none', opacity }}
                    stroke="#1a202c"
                    strokeWidth="0.4"
                    paintOrder="stroke"
                >
                    {label}
                </text>
            )}
        </g>
    );
};

export default StrategicPointSymbol;