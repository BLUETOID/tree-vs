/**
 * Terminal Output Console
 * Displays program execution output and compilation diagnostics
 */

import React from 'react';
import { Terminal, AlertTriangle } from 'lucide-react';

interface TerminalConsoleProps {
  stdout: string;
  error?: string;
  height: number;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({ stdout, error, height }) => {
  return (
    <div className="console-card" style={{ height: `${height}px` }} id="terminal-output-panel">
      <div className="console-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Terminal size={12} />
          <span>Output Terminal (stdout)</span>
        </div>
        <span>C++ std::cout</span>
      </div>

      <div className="console-body">
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
            {stdout ? stdout : <span style={{ color: '#52525b' }}>[Program finished with exit code 0]</span>}
          </>
        )}
      </div>
    </div>
  );
};
