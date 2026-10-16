/**
 * Monaco C++ Code Editor with Synchronized Line Tracking & Native Scrolling
 * Identical to vs-recursion
 */

import React, { useEffect, useRef } from 'react';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditorType } from 'monaco-editor';
import { Code2, Play } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChangeCode: (code: string) => void;
  activeLine?: number;
  readOnly?: boolean;
  onExecute: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChangeCode,
  activeLine,
  readOnly = false,
  onExecute,
}) => {
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const onExecuteRef = useRef<() => void>(onExecute);

  useEffect(() => {
    onExecuteRef.current = onExecute;
  }, [onExecute]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom dark theme matching the workspace palette
    monaco.editor.defineTheme('treeDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '7aa2f7', fontStyle: 'bold' },
        { token: 'type', foreground: '2ac3de' },
        { token: 'string', foreground: '9ece6a' },
        { token: 'number', foreground: 'ff9e64' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'identifier', foreground: 'c0caf5' },
        { token: 'delimiter', foreground: 'bb9af7' },
      ],
      colors: {
        'editor.background': '#141416',
        'editorGutter.background': '#141416',
        'editor.foreground': '#e4e4e7',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#a1a1aa',
        'editor.selectionBackground': '#27272f',
        'editor.lineHighlightBackground': '#1c1c20',
        'editorCursor.foreground': '#f4f4f5',
      },
    });

    monaco.editor.setTheme('treeDark');

    // Ctrl+Enter / Cmd+Enter hotkey to run with fresh callback ref
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onExecuteRef.current();
    });
  };

  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    if (!activeLine) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    const newDecorations = [
      {
        range: {
          startLineNumber: activeLine,
          startColumn: 1,
          endLineNumber: activeLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'line-highlight-exec',
          glyphMarginClassName: 'glyph-exec',
        },
      },
    ];

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    editor.revealLineInCenterIfOutsideViewport(activeLine);
  }, [activeLine]);

  return (
    <div className="editor-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="editor-card-header">
        <div className="card-title">
          <Code2 size={14} className="text-muted" />
          <span>main.cpp</span>
        </div>
        <div className="editor-meta">
          <span className="file-badge">C++ subset</span>
          {activeLine && <span className="active-line-tag">:L{activeLine}</span>}
          <button className="btn-run" onClick={onExecute} title="Run Code (Ctrl+Enter)">
            <Play size={11} />
            <span>Run</span>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MonacoEditor
          height="100%"
          language="cpp"
          value={code}
          onChange={(val) => onChangeCode(val || '')}
          onMount={handleEditorDidMount}
          theme="treeDark"
          loading={<div style={{ height: '100%', background: '#141416' }} />}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            glyphMargin: true,
            lineNumbersMinChars: 3,
            readOnly,
            tabSize: 4,
            automaticLayout: true,
            renderLineHighlight: 'all',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            padding: { top: 10, bottom: 10 },
          }}
        />
      </div>

      <style>{`
        .editor-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 14px;
          height: 36px;
          background-color: var(--bg-surface);
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }
        .card-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-main);
        }
        .text-muted {
          color: var(--text-muted);
        }
        .editor-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .file-badge {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-dim);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: var(--radius-xs);
        }
        .active-line-tag {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          color: var(--accent-amber);
        }
        .btn-run {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          border-radius: var(--radius-xs);
          border: 1px solid rgba(59, 130, 246, 0.4);
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          cursor: pointer;
          transition: all 120ms ease;
        }
        .btn-run:hover {
          background: var(--accent-blue);
          color: #ffffff;
        }
      `}</style>
    </div>
  );
};
