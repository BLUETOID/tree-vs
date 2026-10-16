/**
 * Bottom Playback Controls Bar
 * Sleek, responsive timeline scrubber matching vs-recursion
 */

import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface ControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onScrub: (step: number) => void;
  onChangeSpeed: (speed: number) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  currentStep,
  totalSteps,
  isPlaying,
  speed,
  onPlayPause,
  onNext,
  onPrev,
  onReset,
  onJumpStart,
  onJumpEnd,
  onScrub,
  onChangeSpeed,
}) => {
  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        onPlayPause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        onJumpStart();
      } else if (e.key === 'End') {
        e.preventDefault();
        onJumpEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayPause, onNext, onPrev, onJumpStart, onJumpEnd]);

  return (
    <div className="controls-bar" id="playback-controls-bar">
      <div className="controls-left">
        <button
          className="ctrl-btn"
          onClick={onReset}
          title="Reset Execution"
          disabled={totalSteps === 0 || currentStep === 0}
        >
          <RotateCcw size={15} />
        </button>

        <button
          className="ctrl-btn"
          onClick={onJumpStart}
          title="Jump to Start (Home)"
          disabled={totalSteps === 0 || currentStep === 0}
        >
          <ChevronsLeft size={16} />
        </button>

        <button
          className="ctrl-btn"
          onClick={onPrev}
          title="Step Backward (Left Arrow)"
          disabled={totalSteps === 0 || currentStep === 0}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          className="ctrl-btn play-btn"
          onClick={onPlayPause}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          disabled={totalSteps <= 1}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          className="ctrl-btn"
          onClick={onNext}
          title="Step Forward (Right Arrow)"
          disabled={totalSteps === 0 || currentStep >= totalSteps - 1}
        >
          <ChevronRight size={16} />
        </button>

        <button
          className="ctrl-btn"
          onClick={onJumpEnd}
          title="Jump to End (End)"
          disabled={totalSteps === 0 || currentStep >= totalSteps - 1}
        >
          <ChevronsRight size={16} />
        </button>
      </div>

      <div className="controls-center">
        <div className="slider-track">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentStep}
            onChange={(e) => onScrub(Number(e.target.value))}
            className="slider-input"
            disabled={totalSteps <= 1}
          />
        </div>
        <div className="step-indicator">
          Step <span className="step-num">{totalSteps > 0 ? currentStep + 1 : 0}</span> / {totalSteps}
        </div>
      </div>

      <div className="controls-right">
        <select
          className="speed-select"
          value={speed}
          onChange={(e) => onChangeSpeed(Number(e.target.value))}
          title="Playback speed"
        >
          <option value={0.5}>0.5x</option>
          <option value={1.0}>1.0x</option>
          <option value={1.5}>1.5x</option>
          <option value={2.0}>2.0x</option>
        </select>
      </div>
    </div>
  );
};
