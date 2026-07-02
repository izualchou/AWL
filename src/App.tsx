import React, { useState, useEffect, useRef } from 'react';
import { FSMState, GPSPoint, WorkSession, LocationLog, SysConfig, LogMessage } from './types';
import { generateRoutePoints, filterGPSPoint, getHaversineDistance } from './utils/geo';
import FSMVisualizer from './components/FSMVisualizer';
import MapSimulator from './components/MapSimulator';
import DatabaseInspector from './components/DatabaseInspector';
import NotificationCenter from './components/NotificationCenter';
import VariablesPanel from './components/VariablesPanel';
import { Shield, Sparkles, BookOpen, AlertTriangle, Play, HelpCircle, Layers, Cpu, Database, CheckSquare } from 'lucide-react';

export default function App() {
  // 1. Initial configuration parameters
  const [configs, setConfigs] = useState<SysConfig[]>([
    { key: '%AWL_TAX_RATE', value: '0.67', description: 'Federal tax refund limit rate per kilometer ($/km)' },
    { key: '%AWL_DEBOUNCE_MS', value: '10000', description: 'Debounce timeout to preserve active sessions during brief traffic stops (ms)' },
    { key: '%AWL_ACCEL_LIMIT', value: '1.50', description: 'Maximum physical acceleration threshold to filter node noise (G-Force)' },
    { key: '%AWL_SPEED_LIMIT', value: '160', description: 'Maximum physical vehicle speed limit to discard GPS jumping (km/h)' },
  ]);

  // Read actual config helpers
  const getTaxRate = () => Number(configs.find((c) => c.key === '%AWL_TAX_RATE')?.value || 0.67);
  const getDebounceLimit = () => Number(configs.find((c) => c.key === '%AWL_DEBOUNCE_MS')?.value || 10000);
  const getAccelLimit = () => Number(configs.find((c) => c.key === '%AWL_ACCEL_LIMIT')?.value || 1.50);
  const getSpeedLimit = () => Number(configs.find((c) => c.key === '%AWL_SPEED_LIMIT')?.value || 160);

  // 2. Main Architecture States
  const [currentState, setCurrentState] = useState<FSMState>('STANDBY');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [bufferQueue, setBufferQueue] = useState<GPSPoint[]>([]);
  const [foregroundServiceActive, setForegroundServiceActive] = useState<boolean>(true);

  // SQLite Emulation
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [dbLogs, setDbLogs] = useState<LocationLog[]>([]);

  // Telemetry logger
  const [telemetryLogs, setTelemetryLogs] = useState<LogMessage[]>([]);

  // 3. Simulation Controls
  const [selectedRouteType, setSelectedRouteType] = useState<'standard' | 'noisy' | 'vibration'>('standard');
  const [gpsPoints, setGpsPoints] = useState<GPSPoint[]>([]);
  const [currentPointIndex, setCurrentPointIndex] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(400); // interval ms

  // Debounce & Self-healing trackers
  const [debounceTimer, setDebounceTimer] = useState<number>(0);
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [recoveryTimeLeft, setRecoveryTimeLeft] = useState<number>(0);

  // Store pre-computed route points whenever route type changes
  useEffect(() => {
    const rawNodes = generateRoutePoints(selectedRouteType);
    const convertedPoints: GPSPoint[] = rawNodes.map((n, idx) => {
      let distance = 0;
      if (idx > 0) {
        distance = getHaversineDistance(rawNodes[idx - 1].lat, rawNodes[idx - 1].lng, n.lat, n.lng);
      }
      return {
        id: `node_${idx}_${Date.now()}`,
        lat: n.lat,
        lng: n.lng,
        speed: n.speed,
        acceleration: n.acceleration,
        timestamp: Date.now() + idx * 1000,
        filtered: false,
        distanceFromLastRaw: distance,
      };
    });

    setGpsPoints(convertedPoints);
    setCurrentPointIndex(0);
    setBufferQueue([]);
    setDebounceTimer(0);
  }, [selectedRouteType]);

  // Helper helper to append logs
  const addLog = (
    source: LogMessage['source'],
    message: string,
    type: LogMessage['type'] = 'info'
  ) => {
    const newLog: LogMessage = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString(),
      source,
      message,
      type,
    };
    setTelemetryLogs((prev) => [newLog, ...prev].slice(0, 100)); // cap at 100 logs
  };

  // Initialize with initial logs
  useEffect(() => {
    addLog('ORCHESTRATOR', 'AWL Runtime v3.4 Engine Initialized Successfully.', 'success');
    addLog('FSM', 'System state transitioned: OFFLINE → STANDBY.', 'info');
    addLog('SESSION_MGR', 'Self-healing 15-minute cold start checked. No dangling sessions.', 'success');
    addLog('BATCH_IO', 'SQLite WAL database connections set to synchronous normal mode.', 'info');
  }, []);

  // Update Configs Trigger
  const handleConfigChange = (key: string, value: string) => {
    setConfigs((prev) => prev.map((c) => (c.key === key ? { ...c, value } : c)));
    addLog('ORCHESTRATOR', `Parameter ${key} manually updated to: ${value}`, 'warning');
  };

  // Handle manual/automation state transitions
  const handleStateTransition = (nextState: FSMState) => {
    addLog('FSM', `State Transition: ${currentState} → ${nextState}`, 'info');
    setCurrentState(nextState);

    if (nextState === 'OFFLINE') {
      setForegroundServiceActive(false);
      // Flush buffer if any
      if (bufferQueue.length > 0) {
        flushBufferToDatabase();
      }
      // If we had active session, close it
      if (activeSessionId) {
        completeActiveSession();
      }
    } else if (nextState === 'STANDBY') {
      setForegroundServiceActive(true);
      if (currentState === 'DEBOUNCE') {
        completeActiveSession();
      }
    } else if (nextState === 'ON_TRIP') {
      setForegroundServiceActive(true);
      // Start a new session if not present
      if (!activeSessionId) {
        startNewSession();
      }
    } else if (nextState === 'DEBOUNCE') {
      const limitSec = getDebounceLimit() / 1000;
      setDebounceTimer(limitSec);
      addLog('FSM', `Stationary Debounce Timer armed for ${limitSec}s. Waiting for timeout or resume.`, 'warning');
    }
  };

  // Create a new SQLite driving session
  const startNewSession = () => {
    const newSessionId = `SESS_${Math.floor(100000 + Math.random() * 900000)}`;
    const newSession: WorkSession = {
      id: newSessionId,
      start_time: new Date().toLocaleTimeString(),
      end_time: null,
      business_km: 0,
      tax_deduction: 0,
      status: 'ACTIVE',
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    addLog('SESSION_MGR', `New driving work session started: ${newSessionId}. SQLite transaction open.`, 'success');
  };

  // Close / Complete the active driving session
  const completeActiveSession = () => {
    if (!activeSessionId) return;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              end_time: new Date().toLocaleTimeString(),
              status: 'COMPLETED',
            }
          : s
      )
    );
    addLog('SESSION_MGR', `Driving session finished: ${activeSessionId}. Transaction successfully committed to WAL.`, 'success');
    setActiveSessionId(null);
  };

  // Flush RAM buffer to SQLite WAL
  const flushBufferToDatabase = () => {
    if (bufferQueue.length === 0 || !activeSessionId) return;

    // Calculate total distance of buffered points
    let totalDistMeters = 0;
    const newDbLogs: LocationLog[] = [];

    bufferQueue.forEach((pt, index) => {
      totalDistMeters += pt.distanceFromLastRaw;
      newDbLogs.push({
        id: `log_${Date.now()}_${index}`,
        session_id: activeSessionId,
        lat: pt.lat,
        lng: pt.lng,
        speed: pt.speed,
        acceleration: pt.acceleration,
        timestamp: new Date().toLocaleTimeString(),
        is_filtered: false,
        distance: pt.distanceFromLastRaw,
      });
    });

    const addedKm = totalDistMeters / 1000;

    // Commit logs
    setDbLogs((prev) => [...prev, ...newDbLogs]);

    // Update session metrics
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const updatedKm = s.business_km + addedKm;
          const updatedTax = updatedKm * getTaxRate();
          return {
            ...s,
            business_km: updatedKm,
            tax_deduction: updatedTax,
          };
        }
        return s;
      })
    );

    addLog(
      'BATCH_IO',
      `WAL transaction success. Flushed ${bufferQueue.length} points to SQLite. Added ${addedKm.toFixed(3)} business_km.`,
      'success'
    );

    setBufferQueue([]);
  };

  // Handle single location tick inside the route stream simulation
  const handleLocationTick = () => {
    if (currentPointIndex >= gpsPoints.length - 1) {
      // End of route
      setIsSimulating(false);
      addLog('ORCHESTRATOR', 'Route simulation ended. Destination reached.', 'success');
      
      // If we are in DEBOUNCE or ON_TRIP, clean up and transition back to STANDBY
      if (currentState === 'ON_TRIP' || currentState === 'DEBOUNCE') {
        if (bufferQueue.length > 0) {
          flushBufferToDatabase();
        }
        completeActiveSession();
        setCurrentState('STANDBY');
      }
      return;
    }

    const nextIndex = currentPointIndex + 1;
    setCurrentPointIndex(nextIndex);
    const rawPoint = gpsPoints[nextIndex];

    // FSM Autonomic Decisions based on Speed
    if (rawPoint.speed > 10) {
      if (currentState === 'STANDBY') {
        // Transition STANDBY -> ON_TRIP
        handleStateTransition('ON_TRIP');
      } else if (currentState === 'DEBOUNCE') {
        // Transition DEBOUNCE -> ON_TRIP
        handleStateTransition('ON_TRIP');
      }
    } else if (rawPoint.speed === 0) {
      if (currentState === 'ON_TRIP') {
        // Transition ON_TRIP -> DEBOUNCE
        handleStateTransition('DEBOUNCE');
      }
    }

    // Process tracking logic if we are actively on a trip or debouncing
    if (currentState === 'ON_TRIP' || currentState === 'DEBOUNCE') {
      // Pass raw point through the sliding filter
      const previousFiltered = dbLogs
        .filter((l) => l.session_id === activeSessionId && !l.is_filtered)
        .slice(-2)
        .map((l) => ({ lat: l.lat, lng: l.lng, speed: l.speed, acceleration: l.acceleration }));

      const filterResult = filterGPSPoint(
        {
          lat: rawPoint.lat,
          lng: rawPoint.lng,
          speed: rawPoint.speed,
          acceleration: rawPoint.acceleration,
        },
        previousFiltered,
        getAccelLimit(),
        getSpeedLimit()
      );

      if (filterResult.filtered) {
        // Record as filtered/rejected node
        const filteredLog: LocationLog = {
          id: `log_filtered_${Date.now()}`,
          session_id: activeSessionId || 'NONE',
          lat: rawPoint.lat,
          lng: rawPoint.lng,
          speed: rawPoint.speed,
          acceleration: rawPoint.acceleration,
          timestamp: new Date().toLocaleTimeString(),
          is_filtered: true,
          distance: 0,
        };
        setDbLogs((prev) => [...prev, filteredLog]);
        addLog('FILTER', `Rejected node: ${filterResult.reason}`, 'error');
        gpsPoints[nextIndex].filtered = true;
        gpsPoints[nextIndex].filterReason = filterResult.reason;
      } else {
        // Apply smooth coordinates if sliding window adjusted them
        const finalLat = filterResult.smoothedPoint?.lat || rawPoint.lat;
        const finalLng = filterResult.smoothedPoint?.lng || rawPoint.lng;

        // Queue in 130_BATCH_IO RAM buffer
        const bufferedPoint: GPSPoint = {
          ...rawPoint,
          lat: finalLat,
          lng: finalLng,
          filtered: false,
        };

        // We update buffer queue state
        setBufferQueue((prev) => {
          const nextQueue = [...prev, bufferedPoint];
          if (nextQueue.length >= 5) {
            // Flush immediately inside timeout or next tick
            setTimeout(() => {
              flushBufferToDatabase();
            }, 50);
            return nextQueue; // will be cleared on flush
          }
          return nextQueue;
        });

        addLog('FILTER', `Accepted node at ${finalLat.toFixed(5)}, ${finalLng.toFixed(5)}. Buffered in RAM.`, 'info');
      }
    }
  };

  // Main tick loop
  useEffect(() => {
    let interval: any = null;

    if (isSimulating && !isRecovering) {
      interval = setInterval(() => {
        // If state is DEBOUNCE, tick down the debounce timer
        if (currentState === 'DEBOUNCE') {
          setDebounceTimer((prev) => {
            if (prev <= 1) {
              // Debounce timeout expired, end session and go to STANDBY
              handleStateTransition('STANDBY');
              return 0;
            }
            return prev - 1;
          });
        }

        handleLocationTick();
      }, simulationSpeed);
    }

    return () => clearInterval(interval);
  }, [isSimulating, currentPointIndex, currentState, bufferQueue, activeSessionId, gpsPoints, isRecovering, simulationSpeed]);

  // Self-Healing Recovery simulator tick
  useEffect(() => {
    let recoveryInterval: any = null;

    if (isRecovering) {
      recoveryInterval = setInterval(() => {
        setRecoveryTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRecovering(false);
            // Self-healing check: check SQLite sessions
            const activeSess = sessions.find((s) => s.status === 'ACTIVE');
            addLog('SESSION_MGR', '110_SESSION_MANAGER Cold start checked.', 'info');
            
            if (activeSess) {
              addLog('SESSION_MGR', `Unfinished active session found in SQLite: ${activeSess.id}. Self-healing system state.`, 'warning');
              setActiveSessionId(activeSess.id);
              setCurrentState('ON_TRIP');
              setForegroundServiceActive(true);
              addLog('ORCHESTRATOR', `State recovered to ON_TRIP. Foreground Service re-established. Tracking resumed.`, 'success');
              setIsSimulating(true);
            } else {
              addLog('SESSION_MGR', 'No unclosed session found. Setting state to STANDBY.', 'success');
              setCurrentState('STANDBY');
              setForegroundServiceActive(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(recoveryInterval);
  }, [isRecovering, sessions]);

  // Handle abrupt crash simulation (Self-Healing trigger)
  const handleSimulateCrash = () => {
    setIsSimulating(false);
    setCurrentState('OFFLINE');
    setForegroundServiceActive(false);
    setBufferQueue([]); // RAM buffer lost on crash as per spec (demonstrating why durability is key)
    
    addLog('ORCHESTRATOR', 'CRITICAL ERROR: Process crashed abruptly. RAM Buffer volatile state wiped.', 'error');
    addLog('ORCHESTRATOR', 'Foreground service dead. Tasker process killed by OS Doze pressure.', 'error');
    
    setIsRecovering(true);
    setRecoveryTimeLeft(10); // 10 seconds of simulated 15m delay
  };

  // Compute stats
  const totalBusinessKm = sessions.reduce((sum, s) => sum + s.business_km, 0);
  const totalTaxDeduction = sessions.reduce((sum, s) => sum + s.tax_deduction, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Precision Navigation / Top Header Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm" id="main-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2.5 rounded-lg flex items-center justify-center shadow-md">
              <Cpu className="w-5.5 h-5.5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900 font-sans uppercase">
                  AWL Runtime v3.4
                </h1>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 px-1.5 py-0.5 rounded">
                  TASKER AUTOMATION BASE
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Android High-Precision State, WAL SQLite Trigger & Filter Sandbox
              </p>
            </div>
          </div>

          {/* Quick Metrics display */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-mono font-bold text-slate-400 leading-none uppercase">TOTAL TAX DISTANCE</span>
              <span className="text-sm font-bold text-slate-900 font-mono mt-1">
                {totalBusinessKm.toFixed(2)} km
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-mono font-bold text-slate-400 leading-none uppercase">TAX DEDUCTIBLE LIMIT</span>
              <span className="text-base font-bold text-emerald-600 font-mono mt-0.5">
                ${totalTaxDeduction.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: FSM state provider + Namespace monitoring */}
        <div className="space-y-6 flex flex-col">
          <FSMVisualizer
            currentState={currentState}
            onStateTransition={handleStateTransition}
            debounceTimerSeconds={debounceTimer}
            maxDebounceSeconds={getDebounceLimit() / 1000}
          />

          <VariablesPanel
            currentState={currentState}
            activeSessionId={activeSessionId}
            bufferCount={bufferQueue.length}
            lastGpsAccel={gpsPoints[currentPointIndex]?.acceleration || 0}
            totalBusinessKm={totalBusinessKm}
            totalTaxDeduction={totalTaxDeduction}
            foregroundService={foregroundServiceActive}
            taxRate={getTaxRate()}
            debounceLimitMs={getDebounceLimit()}
            accelLimitG={getAccelLimit()}
          />
        </div>

        {/* Middle Column: Visual Map trace + SQLite explorer */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            <div className="md:col-span-2">
              <MapSimulator
                gpsPoints={gpsPoints}
                currentPointIndex={currentPointIndex}
                isSimulating={isSimulating}
                selectedRouteType={selectedRouteType}
                onStartSimulation={() => setIsSimulating(true)}
                onPauseSimulation={() => setIsSimulating(false)}
                onResetSimulation={() => {
                  setIsSimulating(false);
                  setCurrentPointIndex(0);
                  setBufferQueue([]);
                  setDebounceTimer(0);
                  addLog('ORCHESTRATOR', 'Simulation track reset to starting coordinate.', 'warning');
                }}
                onRouteChange={(type) => setSelectedRouteType(type)}
                simulationSpeed={simulationSpeed}
                onSimulationSpeedChange={(speed) => setSimulationSpeed(speed)}
              />
            </div>

            <div className="md:col-span-2">
              <DatabaseInspector
                sessions={sessions}
                logs={dbLogs}
                configs={configs}
                bufferQueue={bufferQueue}
                onConfigChange={handleConfigChange}
              />
            </div>
          </div>
        </div>

        {/* Right Panel / Bottom sidebar: Orchestrator ongoing alert logs */}
        <div className="lg:col-span-3 xl:col-span-1">
          <NotificationCenter
            logs={telemetryLogs}
            onClearLogs={() => setTelemetryLogs([])}
            onSimulateCrash={handleSimulateCrash}
            isRecovering={isRecovering}
            recoveryTimeLeft={recoveryTimeLeft}
            foregroundServiceActive={foregroundServiceActive}
          />
        </div>
      </main>

      {/* Core documentation panel - Visualized architecture breakdown */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-400" /> Layer 1: Persistence
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              AWL Runtime triggers are committed to SQLite 3 in Write-Ahead Logging (WAL) mode. This guarantees transactional atomicity even if the device restarts unexpectedly mid-trip. Business kilometer summaries are compiled automatically using DB-level triggers to keep Tasker overhead at absolute zero.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" /> Layer 2: Filter Algorithm
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              To keep taxing mileage pure, high-frequency GPS raw coordinates are smoothed through a 3-point Sliding Window low-pass filter. Acceleration filters (limiting anomalous changes exceeding 1.5G) discard spikes when driving through tunnels, urban canyons, or when experiencing high physical vibrations.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Layer 3: Self-Healing 
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              The orchestrator deploys a Foreground Service and Ongoing Notification to limit Android Doze mode collection freezes. In the case of system reboots or crash interruptions, the 110_SESSION_MANAGER triggers a silent 15-minute check, reads SQLite states, and recovers active tracking seamlessly without loss.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-800 mt-6 pt-6 text-center text-xs text-slate-500 font-mono">
          AWL RUNTIME v3.4 AUTOMATION CORE • ARCHITECTURAL SIMULATION ENVIRONMENT • 2026
        </div>
      </footer>
    </div>
  );
}
