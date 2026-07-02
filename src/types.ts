export type FSMState = 'OFFLINE' | 'STANDBY' | 'ON_TRIP' | 'DEBOUNCE';

export interface GPSPoint {
  id: string;
  lat: number;
  lng: number;
  speed: number; // in km/h
  acceleration: number; // in g
  timestamp: number;
  filtered: boolean;
  filterReason?: string;
  distanceFromLastRaw: number; // meters
}

export interface WorkSession {
  id: string;
  start_time: string;
  end_time: string | null;
  business_km: number;
  tax_deduction: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface LocationLog {
  id: string;
  session_id: string;
  lat: number;
  lng: number;
  speed: number;
  acceleration: number;
  timestamp: string;
  is_filtered: boolean;
  distance: number; // in meters
}

export interface SysConfig {
  key: string;
  value: string;
  description: string;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  source: 'FSM' | 'FILTER' | 'BATCH_IO' | 'SESSION_MGR' | 'ORCHESTRATOR' | 'DB';
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
