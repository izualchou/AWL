import React, { useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert, Zap, Layers, Navigation } from 'lucide-react';
import { GPSPoint } from '../types';

interface MapSimulatorProps {
  gpsPoints: GPSPoint[];
  currentPointIndex: number;
  isSimulating: boolean;
  selectedRouteType: 'standard' | 'noisy' | 'vibration';
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResetSimulation: () => void;
  onRouteChange: (type: 'standard' | 'noisy' | 'vibration') => void;
  simulationSpeed: number;
  onSimulationSpeedChange: (speed: number) => void;
}

export default function MapSimulator({
  gpsPoints,
  currentPointIndex,
  isSimulating,
  selectedRouteType,
  onStartSimulation,
  onPauseSimulation,
  onResetSimulation,
  onRouteChange,
  simulationSpeed,
  onSimulationSpeedChange,
}: MapSimulatorProps) {
  // SVG view dimensions
  const width = 600;
  const height = 300;

  // Find min/max of coords to auto-scale the route inside the SVG viewport
  const lats = gpsPoints.map((p) => p.lat);
  const lngs = gpsPoints.map((p) => p.lng);
  const minLat = lats.length ? Math.min(...lats) : 37.77;
  const maxLat = lats.length ? Math.max(...lats) : 37.81;
  const minLng = lngs.length ? Math.min(...lngs) : -122.50;
  const maxLng = lngs.length ? Math.max(...lngs) : -122.40;

  const padding = 35;
  const scaleX = (lng: number) => {
    if (maxLng === minLng) return width / 2;
    return padding + ((lng - minLng) / (maxLng - minLng)) * (width - 2 * padding);
  };
  const scaleY = (lat: number) => {
    if (maxLat === minLat) return height / 2;
    // Invert Y because SVG coordinates start from top-left (0,0)
    return height - padding - ((lat - minLat) / (maxLat - minLat)) * (height - 2 * padding);
  };

  // Slice points up to current point index
  const visiblePoints = gpsPoints.slice(0, currentPointIndex + 1);
  const currentPoint = gpsPoints[currentPointIndex] || null;

  // Build the clean filtered path (only valid points)
  const validPointsPath = visiblePoints.filter((p) => !p.filtered);
  const rawPointsPath = visiblePoints;

  // Generate SVG path commands
  const getPathData = (points: GPSPoint[]) => {
    if (points.length < 2) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.lng).toFixed(1)} ${scaleY(p.lat).toFixed(1)}`)
      .join(' ');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col h-full" id="map-simulator-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider font-sans">
            <Layers className="w-4 h-4 text-slate-500" />
            140_FILTER & Route Simulation
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Physical Sensor Stream → Sliding Window & G-Force Filtering
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Route selector */}
          <select
            value={selectedRouteType}
            onChange={(e) => onRouteChange(e.target.value as any)}
            disabled={isSimulating}
            className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-none hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <option value="standard">Standard Tax Route (Clean)</option>
            <option value="noisy">GPS Drift Route (High Noise)</option>
            <option value="vibration">High-Vibration Offroad</option>
          </select>

          {/* Speed Selector */}
          <select
            value={simulationSpeed}
            onChange={(e) => onSimulationSpeedChange(Number(e.target.value))}
            className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-700 outline-none"
          >
            <option value={1000}>1x Speed</option>
            <option value={400}>2.5x Speed</option>
            <option value={150}>6x Speed</option>
          </select>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative flex-1 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden min-h-[220px] flex items-center justify-center">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-25"></div>

        {gpsPoints.length === 0 ? (
          <div className="text-slate-500 text-xs font-mono">Initializing GPS Stream...</div>
        ) : (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="relative z-10">
            {/* Draw complete reference route path (dotted grey line) */}
            <path
              d={getPathData(gpsPoints)}
              fill="none"
              stroke="#334155"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Draw raw path (yellow/amber) to represent what sensor catches */}
            {rawPointsPath.length > 1 && (
              <path
                d={getPathData(rawPointsPath)}
                fill="none"
                stroke="#eab308"
                strokeWidth="1.5"
                opacity="0.3"
              />
            )}

            {/* Draw filtered path (emerald solid line) - what actually counts */}
            {validPointsPath.length > 1 && (
              <path
                d={getPathData(validPointsPath)}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Historical points */}
            {visiblePoints.map((point, idx) => {
              const cx = scaleX(point.lng);
              const cy = scaleY(point.lat);

              if (point.filtered) {
                // Rejected points are marked with red cross/alert dots
                return (
                  <g key={point.id} className="cursor-help">
                    <circle cx={cx} cy={cy} r="5" fill="#ef4444" opacity="0.8" />
                    <circle cx={cx} cy={cy} r="9" fill="none" stroke="#ef4444" strokeWidth="1" className="animate-ping" style={{ animationDuration: '3s' }} />
                  </g>
                );
              }

              // Normal visible points along the path
              const isCurrent = idx === currentPointIndex;
              return (
                <circle
                  key={point.id}
                  cx={cx}
                  cy={cy}
                  r={isCurrent ? "6" : "3"}
                  fill={isCurrent ? "#10b981" : "#059669"}
                  stroke={isCurrent ? "#ffffff" : "none"}
                  strokeWidth={isCurrent ? 2 : 0}
                />
              );
            })}

            {/* Current Car Marker */}
            {currentPoint && (
              <g transform={`translate(${scaleX(currentPoint.lng)}, ${scaleY(currentPoint.lat)})`} className="transition-transform duration-300">
                <circle cx="0" cy="0" r="16" fill="#10b981" opacity="0.15" className="animate-pulse" />
                <circle cx="0" cy="0" r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                {/* Navigation Chevron */}
                <path
                  d="M0 -5 L3 3 L0 1 L-3 3 Z"
                  fill="#ffffff"
                  transform="scale(0.8)"
                />
              </g>
            )}
          </svg>
        )}

        {/* Floating current sensor specs */}
        {currentPoint && (
          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 text-[11px] font-mono text-slate-300 flex flex-col gap-1 shadow-md z-20">
            <div className="text-slate-500 font-bold border-b border-slate-800 pb-1 mb-1 flex items-center justify-between">
              <span>GPS SENSOR OVERLAY</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE
              </span>
            </div>
            <div>LAT: <span className="text-white">{currentPoint.lat.toFixed(6)}</span></div>
            <div>LNG: <span className="text-white">{currentPoint.lng.toFixed(6)}</span></div>
            <div className="flex gap-4 mt-1 border-t border-slate-800/50 pt-1">
              <div>SPD: <span className="text-amber-400 font-bold">{currentPoint.speed.toFixed(1)} km/h</span></div>
              <div>G: <span className={currentPoint.acceleration > 1.5 ? 'text-red-400 font-bold' : 'text-slate-300'}>{currentPoint.acceleration.toFixed(2)} G</span></div>
            </div>
          </div>
        )}

        {/* Filter warning banner if current point is filtered */}
        {currentPoint?.filtered && (
          <div className="absolute bottom-3 left-3 right-3 bg-red-950/90 backdrop-blur border border-red-800 rounded-lg px-3 py-2 text-xs flex items-center gap-2.5 text-red-200 shadow-lg z-20 animate-bounce">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-bold">140_FILTER Rejected Node:</span> {currentPoint.filterReason}
            </div>
          </div>
        )}
      </div>

      {/* Control panel & metrics bar */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {isSimulating ? (
            <button
              onClick={onPauseSimulation}
              className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              id="pause-simulation-btn"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          ) : (
            <button
              onClick={onStartSimulation}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              id="start-simulation-btn"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Start Route
            </button>
          )}

          <button
            onClick={onResetSimulation}
            className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
            id="reset-simulation-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        {/* Visual Progress Bar */}
        <div className="flex-1 max-w-xs flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-mono">PROGRESS</span>
          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{
                width: `${
                  gpsPoints.length > 0 ? ((currentPointIndex + 1) / gpsPoints.length) * 100 : 0
                }%`,
              }}
            ></div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {currentPointIndex + 1}/{gpsPoints.length}
          </span>
        </div>
      </div>
    </div>
  );
}
