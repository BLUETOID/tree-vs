/**
 * Clean 44px Top Navigation Bar
 * Directly matching the minimalist developer toolbar from vs-recursion
 */

import React from 'react';
import { GitBranch, Info, RotateCcw } from 'lucide-react';
import { PRESET_PROGRAMS } from '../../presets/catalog';

interface HeaderProps {
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  showInfo: boolean;
  onToggleInfo: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedPresetId,
  onSelectPreset,
  showInfo,
  onToggleInfo,
  onReset,
}) => {
  const categories = Array.from(new Set(PRESET_PROGRAMS.map((p) => p.category)));

  return (
    <header className="navbar" id="app-navbar">
      <div className="navbar-left">
        <div className="brand-logo-area" title="Tree-VS C++ Simulator">
          <div className="brand-icon-wrapper">
            <GitBranch size={16} />
          </div>
          <span className="brand-title">Tree-VS</span>
        </div>

        <div className="preset-selector-group">
          <span className="preset-label">Program:</span>
          <select
            id="preset-select"
            value={selectedPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="preset-select"
          >
            {categories.map((cat) => (
              <optgroup key={cat} label={cat}>
                {PRESET_PROGRAMS.filter((p) => p.category === cat).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <button
            className={`btn-icon ${showInfo ? 'active' : ''}`}
            onClick={onToggleInfo}
            title="Toggle Program Info Banner"
          >
            <Info size={14} />
          </button>
        </div>
      </div>

      <div className="navbar-right">
        <button
          className="btn-icon"
          onClick={onReset}
          title="Reset Code & Execution (Ctrl+Enter)"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </header>
  );
};
