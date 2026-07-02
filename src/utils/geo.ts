// Haversine formula to calculate distance between two lat/lng pairs in meters
export function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

// Low-pass sliding window filter for GPS coordinates and noise removal
export function filterGPSPoint(
  currentPoint: { lat: number; lng: number; speed: number; acceleration: number },
  previousPoints: { lat: number; lng: number; speed: number; acceleration: number }[],
  accelLimit: number = 1.5, // max allowed physical acceleration in Gs
  speedLimit: number = 160  // max realistic speed in km/h
): { filtered: boolean; reason?: string; smoothedPoint?: { lat: number; lng: number } } {
  // 1. Acceleration Filter (Physical Constraint)
  if (currentPoint.acceleration > accelLimit) {
    return {
      filtered: true,
      reason: `Acceleration spike detected (${currentPoint.acceleration.toFixed(2)}G > ${accelLimit}G)`,
    };
  }

  // 2. High-speed anomaly filter
  if (currentPoint.speed > speedLimit) {
    return {
      filtered: true,
      reason: `Implausible speed spike (${currentPoint.speed.toFixed(1)} km/h > ${speedLimit} km/h)`,
    };
  }

  // 3. Sliding Window Smoothing (low-pass filter)
  if (previousPoints.length > 0) {
    const window = [...previousPoints.slice(-2), currentPoint];
    const avgLat = window.reduce((sum, p) => sum + p.lat, 0) / window.length;
    const avgLng = window.reduce((sum, p) => sum + p.lng, 0) / window.length;

    // Calculate distance from previous filtered point to check if we are actually moving
    const lastValid = previousPoints[previousPoints.length - 1];
    const dist = getHaversineDistance(lastValid.lat, lastValid.lng, avgLat, avgLng);

    // If speed is 0 and distance is micro-drift (e.g. < 0.5 meters in a second), filter/smooth it
    if (currentPoint.speed === 0 && dist < 1.0) {
      return {
        filtered: false,
        reason: 'Stationary smoothing applied',
        smoothedPoint: { lat: lastValid.lat, lng: lastValid.lng },
      };
    }

    return {
      filtered: false,
      smoothedPoint: { lat: avgLat, lng: avgLng },
    };
  }

  return {
    filtered: false,
    smoothedPoint: { lat: currentPoint.lat, lng: currentPoint.lng },
  };
}

// Generate preset route coordinates
export function generateRoutePoints(type: 'standard' | 'noisy' | 'vibration'): { lat: number; lng: number; speed: number; acceleration: number }[] {
  // Start near San Francisco / Silicon Valley (e.g., 37.7749, -122.4194)
  const startLat = 37.7749;
  const startLng = -122.4194;
  const points: { lat: number; lng: number; speed: number; acceleration: number }[] = [];

  const stepCount = 45;
  for (let i = 0; i <= stepCount; i++) {
    const fraction = i / stepCount;
    
    // Simulate a driving loop (S-curve)
    const lat = startLat + fraction * 0.04 + Math.sin(fraction * Math.PI * 2) * 0.005;
    const lng = startLng + fraction * 0.08 + Math.cos(fraction * Math.PI * 2) * 0.008;

    let speed = 40 + Math.sin(fraction * Math.PI) * 50; // speed curve from 40 to 90 and back
    if (i === 0 || i === stepCount) speed = 0; // stop at start and end

    let acceleration = 0.1 + Math.random() * 0.2; // typical g-force

    // Inject anomalies based on selection
    if (type === 'noisy' && i % 8 === 0 && i !== 0 && i !== stepCount) {
      // Simulate extreme GPS drift (large sudden jump in coordinates, high acceleration)
      points.push({
        lat: lat + 0.008, // spike
        lng: lng - 0.006,
        speed: speed + 80, // speed jump
        acceleration: 2.1, // acceleration spike > 1.5G
      });
    }

    if (type === 'vibration' && i % 5 === 0 && i !== 0 && i !== stepCount) {
      // High physical vibration but normal coordinates
      points.push({
        lat,
        lng,
        speed,
        acceleration: 1.8, // vibration > 1.5G
      });
    }

    points.push({
      lat,
      lng,
      speed,
      acceleration,
    });
  }

  return points;
}
