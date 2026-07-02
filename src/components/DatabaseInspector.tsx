import React, { useState } from 'react';
import { Database, Table, Zap, FileText, Settings, Key, Check } from 'lucide-react';
import { WorkSession, LocationLog, SysConfig } from '../types';

interface DatabaseInspectorProps {
  sessions: WorkSession[];
  logs: LocationLog[];
  configs: SysConfig[];
  bufferQueue: any[];
  onConfigChange: (key: string, value: string) => void;
}

export default function DatabaseInspector({
  sessions,
  logs,
  configs,
  bufferQueue,
  onConfigChange,
}: DatabaseInspectorProps) {
  const [activeTab, setActiveTab] = useState<'sessions' | 'logs' | 'configs'>('sessions');
  const [editingConfigKey, setEditingConfigKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const handleEditConfig = (config: SysConfig) => {
    setEditingConfigKey(config.key);
    setEditingValue(config.value);
  };

  const handleSaveConfig = (key: string) => {
    onConfigChange(key, editingValue);
    setEditingConfigKey(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col h-full" id="database-inspector-card">
      {/* Header and 130_BATCH_IO Queue Monitor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider font-sans">
            <Database className="w-4 h-4 text-slate-500" />
            SQLite 3 (WAL Mode) & 130_BATCH_IO
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Atomicity transactions guarding work sessions & coordinates
          </p>
        </div>

        {/* 5-Point Buffer monitor */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono font-bold text-slate-400 leading-none">130_BATCH_IO BUFFER</span>
            <span className="text-xs font-mono font-bold text-emerald-400 mt-1">
              {bufferQueue.length} / 5 POINTS
            </span>
          </div>
          {/* Buffer grid */}
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((idx) => {
              const hasPoint = idx < bufferQueue.length;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 ${
                    hasPoint
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse'
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                  title={hasPoint ? 'Point buffered in RAM' : 'Empty buffer slot'}
                />
              );
            })}
          </div>
          {bufferQueue.length === 5 && (
            <div className="text-[10px] bg-emerald-950 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-800 font-mono animate-bounce">
              WAL FLUSHING...
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-4 bg-slate-50 p-1 rounded-lg self-start">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'sessions'
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          work_session ({sessions.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'logs'
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          location_log ({logs.length})
        </button>

        <button
          onClick={() => setActiveTab('configs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'configs'
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          sys_config ({configs.length})
        </button>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto max-h-[250px] border border-slate-100 rounded-lg">
        {activeTab === 'sessions' && (
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-2.5 font-bold">SESSION_ID</th>
                <th className="p-2.5 font-bold">START_TIME</th>
                <th className="p-2.5 font-bold">END_TIME</th>
                <th className="p-2.5 font-bold">BUSINESS_KM</th>
                <th className="p-2.5 font-bold text-right">TAX_DEDUCTION</th>
                <th className="p-2.5 font-bold text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                    No active or historical work sessions in SQLite.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">{sess.id}</td>
                    <td className="p-2.5 text-slate-500">{sess.start_time}</td>
                    <td className="p-2.5 text-slate-500">{sess.end_time || '—'}</td>
                    <td className="p-2.5 font-bold text-slate-800">{sess.business_km.toFixed(2)} km</td>
                    <td className="p-2.5 text-right font-bold text-emerald-600">
                      ${sess.tax_deduction.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sess.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {sess.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'logs' && (
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-2.5 font-bold">LOG_ID</th>
                <th className="p-2.5 font-bold">LAT, LNG</th>
                <th className="p-2.5 font-bold">SPD (km/h)</th>
                <th className="p-2.5 font-bold">ACCEL (G)</th>
                <th className="p-2.5 font-bold text-right">DIST (m)</th>
                <th className="p-2.5 font-bold text-center">STATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                    No location records flushed to physical WAL file yet.
                  </td>
                </tr>
              ) : (
                [...logs].reverse().map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-2.5 text-slate-400">#{log.id.slice(0, 6)}</td>
                    <td className="p-2.5 font-bold text-slate-800">
                      {log.lat.toFixed(5)}, {log.lng.toFixed(5)}
                    </td>
                    <td className="p-2.5">{log.speed.toFixed(1)}</td>
                    <td className={`p-2.5 ${log.acceleration > 1.5 ? 'text-red-500 font-bold' : ''}`}>
                      {log.acceleration.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-semibold">{log.distance.toFixed(1)}m</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        log.is_filtered
                          ? 'bg-red-50 text-red-500'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {log.is_filtered ? 'FILTERED' : 'COMMITTED'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'configs' && (
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-2.5 font-bold">PARAMETER (KEY)</th>
                <th className="p-2.5 font-bold">VALUE</th>
                <th className="p-2.5 font-bold">DESCRIPTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {configs.map((config) => (
                <tr key={config.key} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">{config.key}</td>
                  <td className="p-2.5">
                    {editingConfigKey === config.key ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono w-20 bg-slate-50 text-slate-800 focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveConfig(config.key)}
                          className="bg-emerald-50 text-emerald-600 p-1 rounded hover:bg-emerald-100"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => handleEditConfig(config)}
                        className="cursor-pointer font-bold text-indigo-600 hover:underline border-b border-dashed border-indigo-200 pb-0.5"
                        title="Click to edit system parameter"
                      >
                        {config.value}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-slate-500">{config.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* SQL Trigger explanation info overlay */}
      <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-150 flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
        <div className="text-[11px] leading-relaxed text-slate-600">
          <span className="font-bold text-slate-700 font-mono">SQLITE TRIGGER AGGREGATION:</span> When new batch buffers write to 
          <code className="bg-slate-200/60 px-1 rounded mx-1">location_log</code>, an atomic schema trigger automatically sums driving distance, converts it to kilometers, and recalculates tax deduction limits matching 
          <code className="bg-slate-200/60 px-1 rounded mx-1">%AWL_TAX_RATE</code> ($0.67/km). Zero main-thread CPU compute overhead.
        </div>
      </div>
    </div>
  );
}
