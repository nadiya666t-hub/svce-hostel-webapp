/**
 * Central attendance configuration.
 * Change coordinates, timings, or accuracy limits here — nowhere else.
 * All polygon coordinates are [latitude, longitude] pairs.
 */

export const ATTENDANCE_CONFIG = {
  timezone: 'Asia/Kolkata',

  // ── Time window ────────────────────────────────────────────────────────────
  attendanceStart: '20:30', // HH:mm IST
  attendanceEnd:   '20:40', // HH:mm IST

  // ── GPS accuracy ──────────────────────────────────────────────────────────
  maxGpsAccuracyMeters: 50, // reject submissions with accuracy > this value

  // ── HOSTEL geofence polygon (PRIORITY 1) ──────────────────────────────────
  // Exact four-corner boundary — H1 → H2 → H3 → H4 → H1
  hostelGeofence: [
    [13.160041, 77.634677] as [number, number], // H1
    [13.159658, 77.634703] as [number, number], // H2
    [13.159658, 77.634951] as [number, number], // H3
    [13.160017, 77.634952] as [number, number], // H4
  ],
  hostelCentre: { lat: 13.159831, lng: 77.634800 },

  // ── COLLEGE geofence polygon (PRIORITY 2) ─────────────────────────────────
  // Exact four-corner boundary — C1 → C2 → C3 → C4 → C1
  collegeGeofence: [
    [13.160068, 77.634623] as [number, number], // C1
    [13.159434, 77.634612] as [number, number], // C2
    [13.159425, 77.637153] as [number, number], // C3
    [13.160376, 77.637137] as [number, number], // C4
  ],
  collegeCentre: { lat: 13.159965, lng: 77.636275 },
} as const

export type VerifiedLocation = 'HOSTEL' | 'COLLEGE' | 'OUTSIDE'
