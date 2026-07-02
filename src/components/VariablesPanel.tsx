import React from 'react';
import { Key, ShieldCheck, Tag, Info } from 'lucide-react';
import { FSMState } from '../types';

interface VariablesPanelProps {
  currentState: FSMState;
  activeSessionId: string | null;
  bufferCount: number;
  lastGpsAccel: number;
  totalBusinessKm: number;
  totalTaxDeduction: number;
  foregroundService: boolean;
  taxRate: number;
  debounceLimitMs: number;
  accelLimitG: number;
}

export default function VariablesPanel({
  currentState,
  activeSessionId,
  bufferCount,
  lastGpsAccel,
  totalBusinessKm,
  totalTaxDeduction,
  foregroundService,
  taxRate,
  debounceLimitMs,
  accelLimitG,
}: VariablesPanelProps) {
  const variables = [
    {
      name: '%AWL_CURRENT_STATE',
      value: currentState,
      desc: 'System Finite State Machine status.',
      badgeColor: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    },
    {
      name: '%AWL_ACTIVE_SESSION_ID',
      value: activeSessionId || 'NULL',
      desc: 'SQLite index pointer of current active driving trip.',
      badgeColor: activeSessionId ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500',
    },
    {
      name: '%AWL_BUFFER_COUNT',
      value: `${bufferCount} / 5`,
      desc: 'RAM queue count before performing 130_BATCH_IO.',
      badgeColor: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
    {
      name: '%AWL_LAST_GPS_ACCEL',
      value: `${lastGpsAccel.toFixed(2)} G`,
      desc: 'Last recorded sensor physical G-Force.',
      badgeColor: lastGpsAccel > accelLimitG ? 'bg-red-50 border-red-200 text-red-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700',
    },
    {
      name: '%AWL_TOTAL_BUSINESS_KM',
      value: `${totalBusinessKm.toFixed(2)} km`,
      desc: 'Sum total of tax-deductible mileage logged in database.',
      badgeColor: 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold',
    },
    {
      name: '%AWL_TOTAL_TAX_DEDUCTION',
      value: `$${totalTaxDeduction.toFixed(2)}`,
      desc: 'Accumulated tax refund limit matching trigger computations.',
      badgeColor: 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold text-base',
    },
    {
      name: '%AWL_FOREGROUND_SERVICE',
      value: foregroundService ? 'TRUE (ONGOING)' : 'FALSE',
      desc: 'Android Ongoing Notification status preventing Doze kills.',
      badgeColor: foregroundService ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500',
    },
    {
      name: '%AWL_TAX_RATE',
      value: `$${taxRate.toFixed(2)} / km`,
      desc: 'Configured standard business deduction rate.',
      badgeColor: 'bg-slate-50 border-slate-200 text-slate-700',
    },
    {
      name: '%AWL_DEBOUNCE_MS',
      value: `${debounceLimitMs} ms`,
      desc: 'FSM Debounce limit to filter short traffic stops.',
      badgeColor: 'bg-slate-50 border-slate-200 text-slate-700',
    },
    {
      name: '%AWL_ACCEL_LIMIT',
      value: `${accelLimitG} G`,
      desc: '140_FILTER acceleration noise threshold.',
      badgeColor: 'bg-slate-50 border-slate-200 text-slate-700',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col h-full" id="variables-panel-card">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider font-sans">
          <Tag className="w-4 h-4 text-slate-500" />
          %AWL_ Tasker Namespace Monitor
        </h3>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Isolated RAM namespace tracking high-precision automation variables
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[350px] pr-1">
        {variables.map((v) => (
          <div
            key={v.name}
            className="border border-slate-150 rounded-lg p-3 hover:bg-slate-50 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-mono font-bold text-indigo-950 select-all">
                {v.name}
              </span>
              <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded ${v.badgeColor}`}>
                {v.value}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-2">
              {v.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
        <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span>RAM state isolation guarantees safety. Direct database queries as decision gates are forbidden.</span>
      </div>
    </div>
  );
}
