/**
 * Call Stack & Variables Inspector Panel
 */

import React from 'react';
import { Layers, Database, ArrowRight } from 'lucide-react';
import type { CallStackFrame, PointerMarker, TreeNodeData } from '../../types/tree';

interface CallStackPanelProps {
  callStack?: CallStackFrame[];
  pointers?: PointerMarker[];
  nodes?: Record<string, TreeNodeData>;
  onSeekFrame?: (frameId: string) => void;
}

export const CallStackPanel: React.FC<CallStackPanelProps> = ({
  callStack = [],
  pointers = [],
  nodes = {},
  onSeekFrame,
}) => {
  return (
    <div className="callstack-panel-container">
      {/* Active Stack Frames */}
      <div className="panel-sub-card">
        <div className="sub-header">
          <Layers size={13} className="text-cyan" />
          <span>Active Call Stack Frames ({callStack.length})</span>
        </div>

        {callStack.length === 0 ? (
          <div className="empty-sub-card">No active function call frames.</div>
        ) : (
          <div className="frames-list">
            {callStack.map((frame, idx) => (
              <div
                key={frame.id || idx}
                className={`frame-row ${idx === callStack.length - 1 ? 'top-frame' : ''}`}
                onClick={() => onSeekFrame?.(frame.id)}
              >
                <div className="frame-row-top">
                  <span className="frame-badge">#{idx}</span>
                  <span className="frame-func-name">{frame.functionName}</span>
                </div>
                {Object.keys(frame.args).length > 0 && (
                  <div className="frame-params">
                    {Object.entries(frame.args).map(([k, v]) => (
                      <span key={k} className="param-tag">
                        {k} = {typeof v === 'string' && nodes[v] ? `Node(${nodes[v].val})` : String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Pointers & Variable References */}
      <div className="panel-sub-card">
        <div className="sub-header">
          <ArrowRight size={13} className="text-amber" />
          <span>Active Node References & Pointers ({pointers.length})</span>
        </div>

        {pointers.length === 0 ? (
          <div className="empty-sub-card">No active pointer variables.</div>
        ) : (
          <div className="pointers-table">
            {pointers.map((ptr, idx) => (
              <div key={idx} className="ptr-row">
                <span className="ptr-name" style={{ color: ptr.color }}>
                  {ptr.name}
                </span>
                <span className="ptr-arrow">→</span>
                <span className="ptr-target">
                  {ptr.nodeId && nodes[ptr.nodeId]
                    ? `TreeNode(val: ${nodes[ptr.nodeId].val}) [${ptr.nodeId}]`
                    : 'nullptr'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Heap Memory Pool */}
      <div className="panel-sub-card">
        <div className="sub-header">
          <Database size={13} className="text-emerald" />
          <span>Heap Memory Pool ({Object.keys(nodes).length} allocated nodes)</span>
        </div>

        <div className="nodes-chip-list">
          {Object.values(nodes).map((node) => (
            <div key={node.id} className="heap-chip">
              <span className="chip-id">&{node.id}:</span>
              <span className="chip-val">{node.val}</span>
              <span className="chip-links">
                (L: {node.left ? `&${node.left}` : 'null'}, R: {node.right ? `&${node.right}` : 'null'})
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .callstack-panel-container {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
          overflow-y: auto;
          background-color: var(--bg-base);
        }
        .panel-sub-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }
        .sub-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .text-cyan { color: var(--accent-cyan); }
        .text-amber { color: var(--accent-amber); }
        .text-emerald { color: var(--accent-emerald); }

        .empty-sub-card {
          font-size: 11px;
          color: var(--text-dim);
          font-style: italic;
        }

        .frames-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .frame-row {
          padding: 6px 10px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          cursor: pointer;
        }
        .frame-row.top-frame {
          border-color: var(--accent-cyan);
          background-color: rgba(6, 182, 212, 0.08);
        }
        .frame-row-top {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .frame-badge {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-dim);
        }
        .frame-func-name {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          color: var(--text-main);
        }
        .frame-params {
          display: flex;
          gap: 6px;
          margin-top: 4px;
          flex-wrap: wrap;
        }
        .param-tag {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 1px 4px;
          border-radius: 3px;
        }

        .pointers-table {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ptr-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          padding: 3px 6px;
          background: var(--bg-surface);
          border-radius: var(--radius-xs);
        }
        .ptr-name {
          font-weight: 700;
        }
        .ptr-arrow {
          color: var(--text-dim);
        }
        .ptr-target {
          color: var(--text-muted);
        }

        .nodes-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .heap-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 11px;
          padding: 3px 8px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
        }
        .chip-id {
          color: var(--accent-emerald);
        }
        .chip-val {
          color: var(--text-main);
          font-weight: 700;
        }
        .chip-links {
          color: var(--text-dim);
          font-size: 10px;
        }
      `}</style>
    </div>
  );
};
