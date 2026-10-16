/**
 * Free-Form Interactive Canvas Viewport
 * Cursor-centered zoom, smooth pan, fit to view, recursion breadcrumbs HUD,
 * interactive node inspector, and directional tree rendering.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Crosshair, CircleDashed, X } from 'lucide-react';
import type { TreeLayoutResult } from '../../core/layout/tidyTree';
import type { PointerMarker, TreeNodeData } from '../../types/tree';
import { TreeEdgeRenderer } from './TreeEdgeRenderer';
import { TreeNodeRenderer } from './TreeNodeRenderer';
import { PointerBadges } from './PointerBadges';

interface CanvasViewportProps {
  layout: TreeLayoutResult;
  pointers?: PointerMarker[];
  activeNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
  resetCameraTrigger?: number | string;
  breadcrumbs?: string[];
  recursionDepth?: number;
  rawNodes?: Record<string, TreeNodeData>;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  layout,
  pointers = [],
  activeNodeId,
  onSelectNode,
  resetCameraTrigger,
  breadcrumbs,
  recursionDepth,
  rawNodes,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasInitialFitRef = useRef<boolean>(false);

  // Educational Inspector & Metric Toggles
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showHeights, setShowHeights] = useState<boolean>(true);

  // Derive active selection during render (avoid cascading effect renders)
  const activeSelectedId =
    selectedNodeId && layout.nodes.some((n) => n.id === selectedNodeId) ? selectedNodeId : null;

  // Center & Fit to Screen
  const fitToView = useCallback(() => {
    if (!containerRef.current || layout.nodes.length === 0) return;
    const { width: cW, height: cH } = containerRef.current.getBoundingClientRect();
    const bounds = layout.bounds;

    const scaleX = (cW - 80) / Math.max(bounds.width, 100);
    const scaleY = (cH - 80) / Math.max(bounds.height, 100);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.6);

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setZoom(newZoom);
    setPan({
      x: cW / 2 - centerX * newZoom,
      y: cH / 2 - centerY * newZoom + 20,
    });
  }, [layout.bounds, layout.nodes.length]);

  // Center on Active Node
  const centerActiveNode = useCallback(() => {
    if (!containerRef.current || !activeNodeId) return;
    const active = layout.nodes.find((n) => n.id === activeNodeId);
    if (!active) return;

    const { width: cW, height: cH } = containerRef.current.getBoundingClientRect();
    setPan({
      x: cW / 2 - active.x * zoom,
      y: cH / 2 - active.y * zoom,
    });
  }, [activeNodeId, layout.nodes, zoom]);

  // Only auto-fit on explicit resetCameraTrigger or initial node appearance
  useEffect(() => {
    if (resetCameraTrigger !== undefined) {
      fitToView();
    }
  }, [resetCameraTrigger, fitToView]);

  useEffect(() => {
    if (!hasInitialFitRef.current && layout.nodes.length > 0) {
      hasInitialFitRef.current = true;
      fitToView();
    }
  }, [layout.nodes.length, fitToView]);

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.floating-canvas-controls') ||
      (e.target as HTMLElement).closest('.canvas-node-inspector') ||
      (e.target as HTMLElement).closest('.canvas-breadcrumbs-hud') ||
      (e.target as HTMLElement).closest('.tree-node-group')
    ) {
      return;
    }
    setSelectedNodeId(null);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Cursor-Centered Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 3.0);

    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Inspector target node data
  const selectedNode = activeSelectedId ? layout.nodes.find((n) => n.id === activeSelectedId) : null;
  const rawSelected = activeSelectedId && rawNodes ? rawNodes[activeSelectedId] : undefined;
  const nodePointers = activeSelectedId ? pointers.filter((p) => p.nodeId === activeSelectedId) : [];

  return (
    <div
      ref={containerRef}
      className={`tree-viewport-canvas ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      id="tree-canvas-panel"
    >
      {/* Floating Recursion Breadcrumbs HUD at Top-Left */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="canvas-breadcrumbs-hud" onClick={(e) => e.stopPropagation()}>
          <div className="hud-title-bar">
            <span className="hud-label">RECURSION PATH</span>
            {recursionDepth !== undefined && recursionDepth > 0 && (
              <span className="hud-depth-badge">Depth: {recursionDepth}</span>
            )}
          </div>
          <div className="hud-trail">
            {breadcrumbs.map((crumb, idx) => {
              const isLatest = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="hud-chevron">❯</span>}
                  <span className={`hud-crumb ${isLatest ? 'hud-crumb-active' : ''}`} title={crumb}>
                    {crumb}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Canvas Controls Overlay at Top-Right */}
      <div className="floating-canvas-controls" onClick={(e) => e.stopPropagation()}>
        <button
          className={`canvas-btn ${showHeights ? 'active-btn' : ''}`}
          onClick={() => setShowHeights((prev) => !prev)}
          title={showHeights ? 'Hide Subtree Heights' : 'Show Subtree Heights (H)'}
        >
          <span style={{ fontSize: '11px', fontWeight: 700 }}>H</span>
        </button>
        <div className="controls-separator" />
        <button
          className="canvas-btn"
          onClick={() => setZoom((prev) => Math.min(3.0, prev * 1.2))}
          title="Zoom In (Scroll Up)"
        >
          <ZoomIn size={14} />
        </button>
        <button
          className="canvas-btn"
          onClick={() => setZoom((prev) => Math.max(0.25, prev / 1.2))}
          title="Zoom Out (Scroll Down)"
        >
          <ZoomOut size={14} />
        </button>
        <button
          className="canvas-btn"
          onClick={() => setZoom(1)}
          title="100% Zoom"
        >
          <span className="canvas-zoom-text">{Math.round(zoom * 100)}%</span>
        </button>
        <button
          className="canvas-btn"
          onClick={fitToView}
          title="Fit to Screen"
        >
          <Maximize2 size={14} />
        </button>
        <button
          className="canvas-btn"
          onClick={centerActiveNode}
          title="Center on Active Node"
        >
          <Crosshair size={14} />
        </button>
        <button
          className="canvas-btn"
          onClick={() => {
            setPan({ x: 0, y: 0 });
            setZoom(1);
          }}
          title="Reset Position"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Interactive Node Inspector Card at Bottom-Left */}
      {selectedNode && (
        <div className="canvas-node-inspector" onClick={(e) => e.stopPropagation()}>
          <div className="inspector-header">
            <div className="inspector-title">
              <span className="inspector-badge">NODE</span>
              <span className="inspector-val">{selectedNode.val}</span>
              <span className="inspector-id">({selectedNode.id})</span>
            </div>
            <button
              className="inspector-close"
              onClick={() => setSelectedNodeId(null)}
              title="Close Inspector"
            >
              <X size={13} />
            </button>
          </div>

          <div className="inspector-grid">
            <div className="inspector-row">
              <span className="inspector-label">Memory Address:</span>
              <span className="inspector-code">
                {rawSelected?.address ||
                  `0x${(4096 + (parseInt(selectedNode.id.replace(/\D/g, '') || '1')) * 32).toString(16)}`}
              </span>
            </div>
            <div className="inspector-row">
              <span className="inspector-label">Depth (from root):</span>
              <span className="inspector-metric">{selectedNode.depth ?? 0}</span>
            </div>
            <div className="inspector-row">
              <span className="inspector-label">Subtree Height:</span>
              <span className="inspector-metric">{selectedNode.height ?? 0}</span>
            </div>
            {selectedNode.balanceFactor !== undefined && (
              <div className="inspector-row">
                <span className="inspector-label">AVL Balance Factor:</span>
                <span
                  className="inspector-metric"
                  style={{
                    color: Math.abs(selectedNode.balanceFactor) > 1 ? '#f87171' : '#38bdf8',
                  }}
                >
                  {selectedNode.balanceFactor > 0
                    ? `+${selectedNode.balanceFactor}`
                    : selectedNode.balanceFactor}
                </span>
              </div>
            )}
            <div className="inspector-row">
              <span className="inspector-label">Parent:</span>
              <span className="inspector-code">
                {selectedNode.parent
                  ? `${rawNodes?.[selectedNode.parent]?.val ?? selectedNode.parent} (${selectedNode.parent})`
                  : 'nullptr (Root)'}
              </span>
            </div>
            <div className="inspector-row">
              <span className="inspector-label">Left Child:</span>
              <span className="inspector-code">
                {rawSelected?.left
                  ? `${rawNodes?.[rawSelected.left]?.val ?? rawSelected.left} (${rawSelected.left})`
                  : 'nullptr'}
              </span>
            </div>
            <div className="inspector-row">
              <span className="inspector-label">Right Child:</span>
              <span className="inspector-code">
                {rawSelected?.right
                  ? `${rawNodes?.[rawSelected.right]?.val ?? rawSelected.right} (${rawSelected.right})`
                  : 'nullptr'}
              </span>
            </div>
            {nodePointers.length > 0 && (
              <div className="inspector-row">
                <span className="inspector-label">Active Pointers:</span>
                <div className="inspector-badges">
                  {nodePointers.map((p, i) => (
                    <span
                      key={i}
                      className="inspector-ptr-badge"
                      style={{
                        backgroundColor: p.color ? `${p.color}25` : 'rgba(6, 182, 212, 0.2)',
                        borderColor: p.color || '#06b6d4',
                        color: p.color || '#06b6d4',
                      }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {layout.nodes.length === 0 ? (
        <div className="empty-canvas">
          <CircleDashed size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
          <p>Tree generates dynamically as C++ code allocates and links nodes.</p>
        </div>
      ) : (
        <svg className="tree-svg-canvas">
          <defs>
            {/* Grid dot pattern matching vs-recursion */}
            <pattern
              id="canvas-grid"
              width={24 * zoom}
              height={24 * zoom}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x % (24 * zoom)}, ${pan.y % (24 * zoom)})`}
            >
              <circle cx={2} cy={2} r={1} fill="#27272a" />
            </pattern>

            <linearGradient id="grad-node-default" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#18181b" />
            </linearGradient>

            <linearGradient id="grad-node-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            <linearGradient id="grad-node-found" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <linearGradient id="grad-node-inserting" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            <linearGradient id="grad-node-rotating" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            <linearGradient id="grad-node-deleted" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>

            <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            <filter id="badge-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Grid background */}
          <rect width="100%" height="100%" fill="url(#canvas-grid)" />

          {/* Pan & Zoom Transformed Container */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            <TreeEdgeRenderer edges={layout.edges} />
            <TreeNodeRenderer
              nodes={layout.nodes}
              onSelectNode={(nodeId) => {
                setSelectedNodeId(nodeId);
                onSelectNode?.(nodeId);
              }}
              selectedNodeId={activeSelectedId}
              showHeights={showHeights}
            />
            <PointerBadges pointers={pointers} layoutNodes={layout.nodes} />
          </g>
        </svg>
      )}
    </div>
  );
};
