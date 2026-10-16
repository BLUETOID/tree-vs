/**
 * Floating Pointer Badges (root, curr, parent, found, etc.)
 */

import React from 'react';
import type { PointerMarker, TreeLayoutNode } from '../../types/tree';

interface PointerBadgesProps {
  pointers: PointerMarker[];
  layoutNodes: TreeLayoutNode[];
}

export const PointerBadges: React.FC<PointerBadgesProps> = ({ pointers, layoutNodes }) => {
  const nodeMap = new Map<string, TreeLayoutNode>();
  for (const n of layoutNodes) {
    nodeMap.set(n.id, n);
  }

  // Group pointers by target nodeId
  const groupedByNode: Record<string, PointerMarker[]> = {};
  for (const p of pointers) {
    if (!p.nodeId || !nodeMap.has(p.nodeId)) continue;
    if (!groupedByNode[p.nodeId]) groupedByNode[p.nodeId] = [];
    groupedByNode[p.nodeId].push(p);
  }

  return (
    <g className="pointer-badges-layer">
      {Object.entries(groupedByNode).map(([nodeId, ptrs]) => {
        const node = nodeMap.get(nodeId)!;
        const baseY = node.y - node.radius - 12;

        return ptrs.map((ptr, idx) => {
          const badgeY = baseY - idx * 24;
          const badgeWidth = Math.max(48, ptr.name.length * 8 + 16);
          const badgeHeight = 18;

          return (
            <g
              key={`${ptr.name}-${nodeId}-${idx}`}
              transform={`translate(${node.x}, ${badgeY})`}
              className="pointer-badge-group"
            >
              {/* Downward pointer caret */}
              <polygon
                points="0,6 -4,0 4,0"
                fill={ptr.color}
                opacity="0.95"
              />
              {/* Badge capsule */}
              <rect
                x={-badgeWidth / 2}
                y={-badgeHeight}
                width={badgeWidth}
                height={badgeHeight}
                rx={9}
                ry={9}
                fill="#0f1420"
                stroke={ptr.color}
                strokeWidth="1.5"
                filter="url(#badge-shadow)"
              />
              {/* Badge text */}
              <text
                x="0"
                y={-badgeHeight / 2 + 4}
                textAnchor="middle"
                fill={ptr.color}
                fontSize="11"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                {ptr.name}
              </text>
            </g>
          );
        });
      })}
    </g>
  );
};
