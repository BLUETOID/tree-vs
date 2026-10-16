/**
 * Tree Edge SVG Renderer with Curved Cubic Bezier Connectors
 */

import React from 'react';
import type { TreeLayoutEdge } from '../../types/tree';

interface TreeEdgeRendererProps {
  edges: TreeLayoutEdge[];
}

export const TreeEdgeRenderer: React.FC<TreeEdgeRendererProps> = ({ edges }) => {
  return (
    <g className="tree-edges-layer">
      {edges.map((edge) => {
        const { id, x1, y1, x2, y2, state, label } = edge;
        const midY = (y1 + y2) / 2;
        const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

        let strokeColor = 'rgba(255, 255, 255, 0.2)';
        let strokeWidth = 2;
        let isAnimated = false;

        if (state === 'active') {
          strokeColor = '#38bdf8';
          strokeWidth = 3;
          isAnimated = true;
        } else if (state === 'relinking') {
          strokeColor = '#a855f7';
          strokeWidth = 3;
          isAnimated = true;
        } else if (state === 'traversed') {
          strokeColor = '#10b981';
          strokeWidth = 2.5;
        }

        const midX = (x1 + x2) / 2;

        return (
          <g key={id} className="edge-group">
            {/* Background glow stroke if active */}
            {isAnimated && (
              <path
                d={d}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth + 4}
                opacity="0.3"
                strokeLinecap="round"
              />
            )}

            {/* Main edge path */}
            <path
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className={isAnimated ? 'animate-edge-flow' : ''}
            />

            {/* Optional label capsule (L, R, or Trie char) */}
            {label && (
              <g transform={`translate(${midX}, ${midY})`}>
                <circle r="9" fill="#0d111a" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <text
                  x="0"
                  y="3.5"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
