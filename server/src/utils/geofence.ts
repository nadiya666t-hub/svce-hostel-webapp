/**
 * Geofence utilities - kept for backwards compatibility.
 * GPS geofencing is no longer used for attendance validation.
 * Network/IP range checking (networkCheck.ts) is used instead.
 */

export type VerifiedLocation = 'HOSTEL' | 'COLLEGE' | 'OUTSIDE' | 'UNKNOWN'

/** Haversine distance in metres (kept for diagnostics) */
export function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** @deprecated Use networkCheck.ts for attendance validation */
export function checkGeofence(_lat: number, _lng: number): VerifiedLocation {
  return 'OUTSIDE'
}

/** @deprecated GPS no longer used */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)
}

/** @deprecated */
export function pointInPolygon(_lat: number, _lng: number, _polygon: readonly [number,number][]): boolean {
  return false
}
