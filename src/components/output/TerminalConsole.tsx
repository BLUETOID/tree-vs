/**
 * Terminal Console & Custom Input Workspace
 * Displays side-by-side standard input (cin) and standard output (cout)
 * matching competitive programming IDEs like CodeChef.
 */

import React, { useState, useEffect } from 'react';
import { Terminal, AlertTriangle, ArrowRightToLine, Play, SlidersHorizontal } from 'lucide-react';

interface TerminalConsoleProps {
  stdout: string;
  error?: string;
  height: number;
  stdin: string;
  onChangeStdin: (val: string) => void;
  hasCin?: boolean;
  onExecute?: () => void;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  stdout,
  error,
  height,
  stdin,
  onChangeStdin,
  hasCin = false,
  onExecute,
}) => {
  // Always open side-by-side if code has cin or if user explicitly toggles it
  const [showInput, setShowInput] = useState<boolean>(true);

  useEffect(() => {
    if (hasCin) {
      setShowInput(true);
    }
  }, [hasCin]);

  return (
    <div
      className="console-card"
      style={{
        height: `${height}px`,
        display: 'grid',
        gridTemplateColumns: showInput ? '1fr 1fr' : '1fr',
      }}
      id="terminal-split-panel"
    >
      {/* Left Column: Custom Input (stdin) */}
      {showInput && (
        <div
          className="console-panel console-input-panel"
          style={{
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div className="console-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowRightToLine size={12} style={{ color: '#38bdf8' }} />
              <span style={{ fontWeight: 600 }}>Custom Input (stdin)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="console-badge-cin">std::cin</span>
              {onExecute && (
                <button
                  className="btn-console-run"
                  onClick={onExecute}
                  title="Run with Custom Input (Ctrl+Enter)"
                >
                  <Play size={10} fill="#38bdf8" />
                  <span>Run</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <textarea
              id="stdin-input-field"
              className="console-input-textarea"
              value={stdin}
              onChange={(e) => onChangeStdin(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  if (onExecute) onExecute();
                }
              }}
              placeholder={`// Paste custom standard input here\n// Example for tree:\n4\n1 2\n1 3\n2 4`}
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {/* Right Column: Output Terminal (stdout) */}
      <div
        className="console-panel console-output-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="console-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal size={12} style={{ color: '#10b981' }} />
            <span style={{ fontWeight: 600 }}>Output Terminal (stdout)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className={`btn-console-toggle ${showInput ? 'active' : ''}`}
              onClick={() => setShowInput((prev) => !prev)}
              title={showInput ? 'Hide Custom Input Panel' : 'Show Custom Input Panel'}
            >
              <SlidersHorizontal size={11} />
              <span>Input: {showInput ? 'ON' : 'OFF'}</span>
            </button>
            <span className="console-badge-cout">std::cout</span>
          </div>
        </div>

        <div className="console-body" id="terminal-stdout-body">
          {error ? (
            <div style={{ color: '#f87171', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Execution Error:</strong> {error}
              </div>
            </div>
          ) : (
            <>
              <span className="console-prompt">$ g++ main.cpp && ./a.out</span>
              <br />
              {stdout ? (
                <span>{stdout}</span>
              ) : (
                <span style={{ color: '#52525b' }}>[Program finished with exit code 0]</span>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .console-badge-cin {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.3);
          padding: 1px 6px;
          border-radius: var(--radius-xs);
        }
        .console-badge-cout {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          color: #34d399;
          background: rgba(52, 211, 153, 0.12);
          border: 1px solid rgba(52, 211, 153, 0.3);
          padding: 1px 6px;
          border-radius: var(--radius-xs);
        }
        .btn-console-run {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-mono);
          border-radius: var(--radius-xs);
          border: 1px solid rgba(56, 189, 248, 0.4);
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          cursor: pointer;
          transition: all 120ms ease;
        }
        .btn-console-run:hover {
          background: #0284c7;
          color: #ffffff;
        }
        .btn-console-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          font-size: 10px;
          font-family: var(--font-mono);
          border-radius: var(--radius-xs);
          border: 1px solid var(--border-subtle);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-dim);
          cursor: pointer;
          transition: all 120ms ease;
        }
        .btn-console-toggle.active {
          color: #38bdf8;
          border-color: rgba(56, 189, 248, 0.3);
          background: rgba(56, 189, 248, 0.08);
        }
        .btn-console-toggle:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .console-input-textarea {
          width: 100%;
          height: 100%;
          background: #101014;
          color: #e4e4e7;
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.5;
          padding: 8px 12px;
          border: none;
          outline: none;
          resize: none;
          box-sizing: border-box;
        }
        .console-input-textarea::placeholder {
          color: #52525b;
          font-style: italic;
        }
        .console-input-textarea:focus {
          background: #131318;
        }
      `}</style>
    </div>
  );
};
