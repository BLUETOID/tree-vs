/**
 * Tree-VS Studio — Pure C++ Code Simulation & Tree Visualizer
 * Directly modeled on the clean, minimalist developer architecture of vs-recursion
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from './components/common/Header';
import { Controls } from './components/common/Controls';
import { CanvasViewport } from './components/canvas/CanvasViewport';
import { CodeEditor } from './components/editor/CodeEditor';
import { TerminalConsole } from './components/output/TerminalConsole';
import { CallStackPanel } from './components/callstack/CallStackPanel';

import { PRESET_PROGRAMS } from './presets/catalog';
import { computeTreeLayout } from './core/layout/tidyTree';
import { runCppTreeInterpreter } from './core/interpreter';
import type { TraceEvent } from './types/interpreter';
import type { TreeStepSnapshot } from './types/tree';

import {
  GitBranch,
  Layers,
  Activity,
  ChevronRight,
  X,
} from 'lucide-react';

export const App: React.FC = () => {
  // Preset & Editor state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('bst-insert');
  const currentPreset = useMemo(
    () => PRESET_PROGRAMS.find((p) => p.id === selectedPresetId) || PRESET_PROGRAMS[0],
    [selectedPresetId]
  );
  const [code, setCode] = useState<string>(currentPreset.code);
  const [stdin, setStdin] = useState<string>(currentPreset.stdin || '4\n1 2\n1 3\n2 4');

  // Detect if code uses standard input
  const hasCin = useMemo(() => /cin\s*>>/.test(code), [code]);

  // Interpreter & Trace Timeline state
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [runtimeError, setRuntimeError] = useState<string | undefined>(undefined);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const timerRef = useRef<number | null>(null);

  // View state
  const [activeTab, setActiveTab] = useState<'tree' | 'stack'>('tree');
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Resizable Workspace Splitter State
  const [splitPercent, setSplitPercent] = useState<number>(44); // Left column width %
  const [consoleHeight, setConsoleHeight] = useState<number>(180); // Bottom console height px
  const isDraggingSplitterRef = useRef<boolean>(false);
  const isDraggingConsoleRef = useRef<boolean>(false);

  const [runId, setRunId] = useState<number>(1);

  // Execute C++ Interpreter
  const executeTrace = useCallback(
    (sourceCode: string, inputStdin?: string) => {
      setIsPlaying(false);
      const currentStdin = inputStdin !== undefined ? inputStdin : stdin;
      const result = runCppTreeInterpreter(sourceCode, currentStdin);
      setTrace(result.trace);
      setRuntimeError(result.error);
      setCurrentIndex(0);
      setRunId((prev) => prev + 1);
    },
    [stdin]
  );

  // Run on initial mount
  useEffect(() => {
    executeTrace(code, stdin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setCode(preset.code);
      const newStdin = preset.stdin || '';
      setStdin(newStdin);
      executeTrace(preset.code, newStdin);
    }
  };

  // Step Navigation Handlers
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < trace.length - 1) return prev + 1;
      setIsPlaying(false);
      return prev;
    });
  }, [trace.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleJumpToStart = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const handleJumpToEnd = useCallback(() => {
    setCurrentIndex(Math.max(0, trace.length - 1));
    setIsPlaying(false);
  }, [trace.length]);

  const handlePlayToggle = useCallback(() => {
    if (currentIndex >= trace.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }, [currentIndex, trace.length]);

  const handleReset = useCallback(() => {
    executeTrace(code, stdin);
  }, [code, stdin, executeTrace]);

  // Auto-play interval
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(100, 800 / speed);
      timerRef.current = window.setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= trace.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, trace.length]);

  // Splitter Drag Listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSplitterRef.current) {
        const newPercent = (e.clientX / window.innerWidth) * 100;
        setSplitPercent(Math.min(Math.max(newPercent, 25), 75));
      } else if (isDraggingConsoleRef.current) {
        const newHeight = window.innerHeight - e.clientY - 48; // offset bottom controls
        setConsoleHeight(Math.min(Math.max(newHeight, 80), 450));
      }
    };

    const handleMouseUp = () => {
      isDraggingSplitterRef.current = false;
      isDraggingConsoleRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Current Step Event
  const currentEvent = trace[currentIndex] || {
    step: 0,
    line: 1,
    callStack: [],
    stdout: '',
    explanation: 'Ready. Run code or step forward to begin simulation.',
  };

  const treeSnapshot: TreeStepSnapshot = currentEvent.treeSnapshot || {
    stepIndex: 0,
    nodes: {},
    rootId: null,
    pointers: [],
    action: 'Ready',
    explanation: currentEvent.explanation,
    auxiliary: {},
  };

  // Compute Layout (Guaranteed collision-free)
  const layout = useMemo(() => {
    return computeTreeLayout(treeSnapshot.nodes, treeSnapshot.rootId);
  }, [treeSnapshot.nodes, treeSnapshot.rootId]);

  // Find active node from active pointers
  const activePointer = treeSnapshot.pointers?.find((p) => p.name === 'curr' || p.name === 'root');
  const activeNodeId = activePointer?.nodeId || undefined;

  return (
    <div className="app-container" id="tree-vs-app">
      {/* 44px Top Navbar */}
      <Header
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        showInfo={showInfo}
        onToggleInfo={() => setShowInfo((prev) => !prev)}
        onReset={handleReset}
      />

      {/* Program Description Banner */}
      {showInfo && (
        <div className="info-banner" id="program-info-banner">
          <div className="info-content">
            <strong>{currentPreset.name}:</strong> {currentPreset.description}
            <span className="info-detail">{currentPreset.explanation}</span>
          </div>
          <button className="btn-close" onClick={() => setShowInfo(false)} title="Close banner">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Step Narration Strip */}
      <div className="narration-strip" id="step-narration-strip">
        <div className="narration-meta">
          <Activity size={13} style={{ color: '#71717a' }} />
          <span className="narration-step-label">
            Step {trace.length > 0 ? currentIndex + 1 : 0}:
          </span>
          <span className="narration-badge badge-line">
            {currentEvent.callStack.length > 0
              ? currentEvent.callStack[currentEvent.callStack.length - 1].name
              : 'LINE'}
          </span>
          {currentEvent.line && <span className="narration-line">:L{currentEvent.line}</span>}
        </div>

        <div className="narration-text" id="step-explanation-text">
          {currentEvent.explanation}
        </div>

        {/* Stack Breadcrumb Chain */}
        {currentEvent.callStack.length > 0 && (
          <div className="stack-breadcrumbs" title="Call stack chain">
            {currentEvent.callStack.map((frame, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={11} className="breadcrumb-sep" />}
                <span className={`breadcrumb-item ${i === currentEvent.callStack.length - 1 ? 'active' : ''}`}>
                  {frame.name}({Object.values(frame.args).join(',')})
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Main Resizable Layout Grid */}
      <main
        className="main-content"
        style={{
          gridTemplateColumns: `${splitPercent}% 6px calc(${100 - splitPercent}% - 6px)`,
        }}
      >
        {/* Left Column: Code Editor + Output Console */}
        <div className="column-left">
          <div style={{ height: `calc(100% - ${consoleHeight}px - 6px)`, overflow: 'hidden' }}>
            <CodeEditor
              code={code}
              onChangeCode={(newCode) => setCode(newCode)}
              activeLine={currentEvent.line}
              readOnly={isPlaying}
              onExecute={() => executeTrace(code, stdin)}
            />
          </div>

          {/* Horizontal Drag Resizer for Terminal */}
          <div
            className="resizer-horizontal"
            title="Drag to resize terminal output"
            onMouseDown={(e) => {
              e.preventDefault();
              isDraggingConsoleRef.current = true;
              document.body.style.cursor = 'row-resize';
              document.body.style.userSelect = 'none';
            }}
          />

          {/* Bottom Terminal Output & Custom Input */}
          <TerminalConsole
            stdout={currentEvent.stdout || ''}
            error={runtimeError}
            height={consoleHeight}
            stdin={stdin}
            onChangeStdin={(val) => setStdin(val)}
            hasCin={hasCin}
            onExecute={() => executeTrace(code, stdin)}
          />
        </div>

        {/* Vertical Splitter between Editor and Canvas */}
        <div
          className="resizer-vertical"
          title="Drag to resize columns"
          onMouseDown={(e) => {
            e.preventDefault();
            isDraggingSplitterRef.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        />

        {/* Right Column: Visualizer Viewport */}
        <div className="column-right">
          <div className="column-header-tabs">
            <div className="tabs-group">
              <button
                className={`tab-btn ${activeTab === 'tree' ? 'active' : ''}`}
                onClick={() => setActiveTab('tree')}
              >
                <GitBranch size={13} />
                <span>Tree Canvas</span>
                <span style={{ fontSize: '10px', color: '#71717a', fontFamily: 'var(--font-mono)' }}>
                  ({layout.nodes.length} nodes)
                </span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'stack' ? 'active' : ''}`}
                onClick={() => setActiveTab('stack')}
              >
                <Layers size={13} />
                <span>Call Stack & State</span>
                <span style={{ fontSize: '10px', color: '#71717a', fontFamily: 'var(--font-mono)' }}>
                  ({currentEvent.callStack.length})
                </span>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {activeTab === 'tree' ? (
              <CanvasViewport
                layout={layout}
                pointers={treeSnapshot.pointers}
                activeNodeId={activeNodeId}
                resetCameraTrigger={runId}
                breadcrumbs={treeSnapshot.auxiliary?.breadcrumbs}
                recursionDepth={treeSnapshot.auxiliary?.recursionDepth}
                rawNodes={treeSnapshot.nodes}
              />
            ) : (
              <CallStackPanel
                callStack={treeSnapshot.auxiliary?.callStack}
                pointers={treeSnapshot.pointers}
                nodes={treeSnapshot.nodes}
              />
            )}
          </div>
        </div>
      </main>

      {/* Bottom Playback Controls Bar */}
      <Controls
        currentStep={currentIndex}
        totalSteps={trace.length}
        isPlaying={isPlaying}
        speed={speed}
        onPlayPause={handlePlayToggle}
        onNext={handleNext}
        onPrev={handlePrev}
        onReset={handleReset}
        onJumpStart={handleJumpToStart}
        onJumpEnd={handleJumpToEnd}
        onScrub={(st) => {
          setIsPlaying(false);
          setCurrentIndex(st);
        }}
        onChangeSpeed={(sp) => setSpeed(sp)}
      />
    </div>
  );
};

export default App;
