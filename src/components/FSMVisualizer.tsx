import React from 'react';
import { FSMState } from '../types';
import { Activity, Shield, Battery, RefreshCw, Compass, AlertCircle, ArrowRight } from 'lucide-react';

interface FSMVisualizerProps {
  currentState: FSMState;
  onStateTransition: (nextState: FSMState) => void;
  debounceTimerSeconds: number;
  maxDebounceSeconds: number;
}

export default function FSMVisualizer({
  currentState,
  onStateTransition,
  debounceTimerSeconds,
  maxDebounceSeconds,
}: FSMVisualizerProps) {
  const states: { id: FSMState; label: string; desc: string; color: string; bgActive: string; textActive: string }[] = [
    {
      id: 'OFFLINE',
      label: '101_OFFLINE',
      desc: 'Ignition Off / Silent Mode. Background processes suspended to conserve battery.',
      color: 'border-slate-200 text-slate-400 bg-slate-50',
      bgActive: 'bg-slate-900 border-slate-900 shadow-md ring-4 ring-slate-200',
      textActive: 'text-white',
    },
    {
      id: 'STANDBY',
      label: '102_STANDBY',
      desc: 'System Active. Self-healing loop active. Awaiting motion sensor / speed triggers.',
      color: 'border-slate-200 text-slate-400 bg-slate-50',
      bgActive: 'bg-amber-600 border-amber-600 shadow-md ring-4 ring-amber-100',
      textActive: 'text-white',
    },
    {
      id: 'ON_TRIP',
      label: '103_ON_TRIP',
      desc: 'Actively tracking trip. GPS high-frequency sampling on. Buffer queuing points.',
      color: 'border-slate-200 text-slate-400 bg-slate-50',
      bgActive: 'bg-emerald-600 border-emerald-600 shadow-md ring-4 ring-emerald-100',
      textActive: 'text-white',
    },
    {
      id: 'DEBOUNCE',
      label: '104_DEBOUNCE',
      desc: 'Temporary stationary state (e.g. traffic light). Awaiting timeout to compile trip.',
      color: 'border-slate-200 text-slate-400 bg-slate-50',
      bgActive: 'bg-indigo-600 border-indigo-600 shadow-md ring-4 ring-indigo-100',
      textActive: 'text-white',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col h-full" id="fsm-visualizer-card">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider font-sans">
          <Activity className="w-4 h-4 text-slate-500" />
          100_WORK_STATE_PROVIDER (FSM)
        </h3>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Deterministic Automaton guarding state machine integrity
        </p>
      </div>

      {/* State Node Graph */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
        {states.map((state) => {
          const isActive = currentState === state.id;
          return (
            <div
              key={state.id}
              className={`border rounded-lg p-4 transition-all duration-300 flex flex-col justify-between ${
                isActive ? state.bgActive : state.color
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-mono tracking-wider font-bold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {state.label}
                  </span>
                  {isActive && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                  )}
                </div>
                <h4 className={`text-sm font-semibold font-sans ${isActive ? 'text-white' : 'text-slate-800'}`}>
                  {state.id}
                </h4>
                <p className={`text-xs mt-2 leading-relaxed ${isActive ? 'text-white/85' : 'text-slate-500'}`}>
                  {state.desc}
                </p>
              </div>

              {state.id === 'DEBOUNCE' && isActive && (
                <div className="mt-3 bg-white/20 rounded-md p-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white font-medium uppercase tracking-wide">
                    DEBOUNCE TIMER
                  </span>
                  <span className="text-xs font-mono text-white font-bold animate-pulse">
                    {debounceTimerSeconds}s / {maxDebounceSeconds}s
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Interactive FSM Trigger overrides */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <h4 className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider mb-2">
          Manual Event Injector (Safety Transition Overrides)
        </h4>
        <div className="flex flex-wrap gap-2">
          {currentState === 'OFFLINE' && (
            <button
              onClick={() => onStateTransition('STANDBY')}
              className="text-[11px] font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Battery className="w-3.5 h-3.5 text-amber-500" /> IGNITION_ON → STANDBY
            </button>
          )}

          {currentState === 'STANDBY' && (
            <>
              <button
                onClick={() => onStateTransition('ON_TRIP')}
                className="text-[11px] font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-500" /> SPEED_DETECTED → ON_TRIP
              </button>
              <button
                onClick={() => onStateTransition('OFFLINE')}
                className="text-[11px] font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-500" /> SHUTDOWN → OFFLINE
              </button>
            </>
          )}

          {currentState === 'ON_TRIP' && (
            <>
              <button
                onClick={() => onStateTransition('DEBOUNCE')}
                className="text-[11px] font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-500" /> STOPPED → DEBOUNCE
              </button>
              <button
                onClick={() => onStateTransition('STANDBY')}
                className="text-[11px] font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-500" /> FORCE_STOP → STANDBY
              </button>
            </>
          )}

          {currentState === 'DEBOUNCE' && (
            <>
              <button
                onClick={() => onStateTransition('ON_TRIP')}
                className="text-[11px] font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-500" /> RESUME_MOTION → ON_TRIP
              </button>
              <button
                onClick={() => onStateTransition('STANDBY')}
                className="text-[11px] font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500" /> TIMEOUT_EXPIRED → STANDBY
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
