/**
 * Central attendance configuration.
 * GPS geofencing has been replaced by Wi-Fi/network-range verification.
 * Network config is in .env: HOSTEL_WIFI_NETWORK, COLLEGE_WIFI_NETWORK
 */

export const ATTENDANCE_CONFIG = {
  timezone: 'Asia/Kolkata',

  // ── Default attendance time window (IST) ───────────────────────────────────
  attendanceStart: '20:30', // 8:30 PM
  attendanceEnd:   '21:00', // 9:00 PM

  // ── Hostel Wi-Fi network (CIDR) ────────────────────────────────────────────
  // SSID: SVCE-GH | Gateway: 172.16.0.1 | Mask: 255.255.240.0
  hostelWifiNetwork: process.env.HOSTEL_WIFI_NETWORK ?? '172.16.0.0/20',

  // ── College Wi-Fi network (CIDR) – will be configured later ───────────────
  collegeWifiNetwork: process.env.COLLEGE_WIFI_NETWORK ?? null,

} as const

export type VerifiedLocation = 'HOSTEL' | 'COLLEGE' | 'OUTSIDE' | 'UNKNOWN'
