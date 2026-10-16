/**
 * SVG Tree Node Renderer with Glow Rings, Balance Factors, and State Badges
 */

import React from 'react';
import type { TreeLayoutNode } from '../../types/tree';

interface TreeNodeRendererProps {
  nodes: TreeLayoutNode[];
  onSelectNode?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  showHeights?: boolean;
}

export const TreeNodeRenderer: React.FC<TreeNodeRendererProps> = ({
  nodes,
  onSelectNode,
  selectedNodeId,
  showHeights = true,
}) => {
  return (
    <g className="tree-nodes-layer">
      {nodes.map((node) => {
        const { id, val, x, y, radius, state, balanceFactor, height, isWordEnd, rank } = node;
        const isSelected = selectedNodeId === id;

        let strokeColor = 'rgba(255, 255, 255, 0.2)';
        let fillGradId = 'grad-node-default';
        let isPulsing = false;
        let textColor = '#f8fafc';

        switch (state) {
          case 'active':
          case 'comparing':
            strokeColor = '#38bdf8';
            fillGradId = 'grad-node-active';
            isPulsing = true;
            textColor = '#ffffff';
            break;
          case 'found':
            strokeColor = '#10b981';
            fillGradId = 'grad-node-found';
            textColor = '#ffffff';
            break;
          case 'inserting':
            strokeColor = '#34d399';
            fillGradId = 'grad-node-inserting';
            isPulsing = true;
            break;
          case 'rotating':
          case 'swapping':
            strokeColor = '#a855f7';
            fillGradId = 'grad-node-rotating';
            isPulsing = true;
            break;
          case 'deleted':
            strokeColor = '#f43f5e';
            fillGradId = 'grad-node-deleted';
            textColor = '#fda4af';
            break;
        }

        return (
          <g
            key={id}
            transform={`translate(${x}, ${y})`}
            className={`tree-node-group node-state-${state}`}
            onClick={() => onSelectNode?.(id)}
            style={{ cursor: 'pointer' }}
          >
            {/* Outer animated pulsing ring if active */}
            {isPulsing && (
              <circle
                r={radius + 8}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                opacity="0.4"
                className="animate-pulse-ring"
              />
            )}

            {/* Selected Node Amber Focus Ring */}
            {isSelected && (
              <circle
                r={radius + 5}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.2"
                strokeDasharray="4 3"
              />
            )}

            {/* Node body circle */}
            <circle
              r={radius}
              fill={`url(#${fillGradId})`}
              stroke={isSelected ? '#f59e0b' : strokeColor}
              strokeWidth={isSelected ? '3' : '2.5'}
              filter="url(#node-shadow)"
            />

            {/* Node value text */}
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fill={textColor}
              fontSize={String(val).length > 3 ? '12' : '14'}
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {val}
            </text>

            {/* Balance Factor badge if AVL (attached at top-right) */}
            {balanceFactor !== undefined && (
              <g transform={`translate(${radius - 4}, ${-radius + 4})`}>
                <circle
                  r="10"
                  fill={Math.abs(balanceFactor) > 1 ? '#ef4444' : '#1e293b'}
                  stroke={Math.abs(balanceFactor) > 1 ? '#f87171' : '#64748b'}
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="3.5"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="800"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {balanceFactor > 0 ? `+${balanceFactor}` : balanceFactor}
                </text>
              </g>
            )}

            {/* Height badge (attached at bottom-right) */}
            {showHeights && height !== undefined && balanceFactor === undefined && (
              <g transform={`translate(${radius - 4}, ${radius - 4})`}>
                <rect
                  x="-12"
                  y="-7"
                  width="24"
                  height="14"
                  rx="7"
                  fill="#0f172a"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="3.5"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  h:{height}
                </text>
              </g>
            )}

            {/* Trie word end flag */}
            {isWordEnd && (
              <g transform={`translate(${radius - 4}, ${-radius + 4})`}>
                <circle r="7" fill="#10b981" stroke="#34d399" strokeWidth="1.5" />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="800"
                >
                  ★
                </text>
              </g>
            )}

            {/* DSU Rank badge */}
            {rank !== undefined && (
              <g transform={`translate(${radius - 4}, ${radius - 4})`}>
                <rect
                  x="-14"
                  y="-7"
                  width="28"
                  height="14"
                  rx="7"
                  fill="#581c87"
                  stroke="#a855f7"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="3.5"
                  textAnchor="middle"
                  fill="#f3e8ff"
                  fontSize="8"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  r:{rank}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
