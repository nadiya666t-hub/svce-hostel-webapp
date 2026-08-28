/**
 * Geofence utilities.
 *
 * Uses the ray-casting (Jordan curve theorem) algorithm for point-in-polygon.
 * This is a well-tested O(n) approach suitable for small polygons.
 *
 * Coordinates are [latitude, longitude] pairs. Because we are dealing with
 * small polygons (metres to hundreds of metres), treating lat/lng as Cartesian
 * coordinates is accurate enough and avoids projection complexity.
 */

import { ATTENDANCE_CONFIG, type VerifiedLocation } from '../config/attendanceConfig'

type Coord = [number, number] // [lat, lng]

/**
 * Ray-casting point-in-polygon algorithm.
 * Returns true if the point [lat, lng] is inside the given polygon.
 * The polygon is defined as an array of [lat, lng] vertices (auto-closed).
 */
export function pointInPolygon(lat: number, lng: number, polygon: readonly Coord[]): boolean {
  const n = polygon.length
  if (n < 3) return false

  let inside = false
  let j = n - 1

  for (let i = 0; i < n; i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]

    // Ray from point in +x direction crosses edge i→j?
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi

    if (intersects) inside = !inside
    j = i
  }

  return inside
}

/**
 * Haversine distance in metres between two GPS points.
 * Used for diagnostic/informational purposes (e.g. "you are X m away").
 */
export function haversineMetres(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Priority geofence check.
 * Returns 'HOSTEL', 'COLLEGE', or 'OUTSIDE'.
 *
 * Logic:
 *   1. Check HOSTEL polygon first.
 *   2. If outside hostel, check COLLEGE polygon.
 *   3. If outside both, return OUTSIDE.
 */
export function checkGeofence(lat: number, lng: number): VerifiedLocation {
  if (pointInPolygon(lat, lng, ATTENDANCE_CONFIG.hostelGeofence)) return 'HOSTEL'
  if (pointInPolygon(lat, lng, ATTENDANCE_CONFIG.collegeGeofence)) return 'COLLEGE'
  return 'OUTSIDE'
}

/**
 * Validate GPS coordinates are plausible (roughly within India).
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    isFinite(lat) && isFinite(lng) &&
    lat >= 6 && lat <= 37 &&   // India bounding box lat
    lng >= 68 && lng <= 98     // India bounding box lng
  )
}
