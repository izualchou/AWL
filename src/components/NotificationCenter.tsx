import React, { useState } from 'react';
import { LogMessage } from '../types';
import { Smartphone, Bell, Heart, ShieldCheck, Terminal, Trash2, ShieldAlert, Zap, Cpu } from 'lucide-react';

interface NotificationCenterProps {
  logs: LogMessage[];
  onClearLogs: () => void;
  onSimulateCrash: () => void;
  isRecovering: boolean;
  recoveryTimeLeft: number;
  foregroundServiceActive: boolean;
}

export default function NotificationCenter({
  logs,
  onClearLogs,
  onSimulateCrash,
  isRecovering,
  recoveryTimeLeft,
  foregroundServiceActive,
}: NotificationCenterProps) {
  const [showNotificationDrawer, setShowNotificationDrawer] = useState<boolean>(true);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col h-full" id="notification-center-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider font-sans">
            <Smartphone className="w-4 h-4 text-slate-500" />
            600_ORCHESTRATOR & OS Sandbox
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Android System Integration, Doze Prevention, Self-Healing
          </p>
        </div>

        <button
          onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
          className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
        >
          <Bell className="w-3.5 h-3.5 text-indigo-500" />
          {showNotificationDrawer ? 'Hide Android UI' : 'Show Android UI'}
        </button>
      </div>

      {/* Simulated Android Notification Shade */}
      {showNotificationDrawer && (
        <div className="mb-4 bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-inner flex flex-col gap-3">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 pb-2 border-b border-slate-800">
            <span>ANDROID SYSTEM STATS</span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" /> API LEVEL 34 (Android 14)
            </span>
          </div>

          {/* Foreground Service Notification Banner */}
          {foregroundServiceActive ? (
            <div className="bg-slate-900 border-l-4 border-indigo-500 rounded-r-lg p-3 flex items-start gap-3 shadow-md">
              <Heart className="w-4 h-4 text-rose-500 mt-0.5 animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200 font-sans">AWL Runtime v3.4 • Active Monitoring</span>
                  <span className="text-[9px] font-mono bg-indigo-950 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-800">
                    FOREGROUND
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  600_ORCHESTRATOR Ongoing notification preventing Doze mode termination.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border-l-4 border-slate-700 rounded-r-lg p-3 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 font-sans">AWL Monitor Inactive</span>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  Background engine suspended. Android OS may claim memory at any time.
                </p>
              </div>
            </div>
          )}

          {/* Self Healing Cold-Start state */}
          {isRecovering && (
            <div className="bg-amber-950/60 border border-amber-800/80 rounded-lg p-3 flex items-start gap-3 animate-pulse">
              <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-[11px] font-bold text-amber-200 font-sans">110_SESSION_MANAGER Self-Healing</span>
                <p className="text-[10px] text-amber-400 font-mono mt-1 leading-relaxed">
                  System recovered from anomalous shutdown. Simulating 15m idle check... ({recoveryTimeLeft}s left). SQLite session state auto-synchronized.
                </p>
              </div>
            </div>
          )}

          {/* OS Control simulation tools */}
          <div className="flex gap-2 border-t border-slate-900 pt-3">
            <button
              onClick={onSimulateCrash}
              disabled={isRecovering}
              className="flex-1 bg-red-950 text-red-400 hover:bg-red-900 border border-red-800/60 disabled:opacity-50 rounded-lg py-1.5 px-2 text-xs font-bold font-mono tracking-wide transition-all uppercase"
              id="simulate-crash-btn"
            >
              Simulate System OS Crash
            </button>
          </div>
        </div>
      )}

      {/* Terminal logs component */}
      <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 p-4 font-mono flex flex-col min-h-[180px] h-[220px]">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pb-2 border-b border-slate-800/80 mb-2">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" /> LIVE TELEMETRY DEBUGLOG
          </span>
          <button
            onClick={onClearLogs}
            className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 font-mono uppercase tracking-wide text-[9px]"
            title="Flush log buffer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto text-[11px] leading-relaxed space-y-1.5 pr-1">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic text-center pt-8">No logging output. Trigger an event to stream.</div>
          ) : (
            logs.map((log) => {
              const sourceColors = {
                FSM: 'text-indigo-400',
                FILTER: 'text-amber-400',
                BATCH_IO: 'text-emerald-400',
                SESSION_MGR: 'text-sky-400',
                ORCHESTRATOR: 'text-purple-400',
                DB: 'text-teal-400',
              };

              const typeColors = {
                info: 'text-slate-300',
                success: 'text-emerald-400 font-semibold',
                warning: 'text-amber-400 font-semibold',
                error: 'text-red-400 font-semibold',
              };

              return (
                <div key={log.id} className="flex items-start gap-1.5 hover:bg-slate-900/50 p-0.5 rounded transition-colors">
                  <span className="text-slate-600 text-[10px] flex-shrink-0 select-none">[{log.timestamp}]</span>
                  <span className={`font-bold text-[10px] ${sourceColors[log.source] || 'text-slate-400'} flex-shrink-0 select-none`}>
                    {log.source}:
                  </span>
                  <span className={`${typeColors[log.type]}`}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
