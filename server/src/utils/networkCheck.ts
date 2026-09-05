/**
 * Network/Wi-Fi validation utility.
 *
 * Replaces GPS geofencing with IP-range CIDR checking.
 * The hostel Wi-Fi network (SVCE-GH) uses the range 172.16.0.0/20.
 *
 * Usage:
 *   import { isIpInNetwork, getClientIp, getNetworkVerification } from '../utils/networkCheck'
 */

import { Request } from 'express'

// ─── CIDR parsing ─────────────────────────────────────────────────────────────

function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return -1
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

/**
 * Check whether a given IP address falls within a CIDR range.
 * Example: isIpInNetwork('172.16.14.41', '172.16.0.0/20') → true
 */
export function isIpInNetwork(clientIp: string, cidr: string): boolean {
  if (!clientIp || !cidr) return false

  const [networkAddr, prefixLenStr] = cidr.split('/')
  const prefixLen = parseInt(prefixLenStr, 10)

  if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) return false

  const clientLong  = ipToLong(clientIp)
  const networkLong = ipToLong(networkAddr)

  if (clientLong < 0 || networkLong < 0) return false

  // Build subnet mask from prefix length
  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0

  return (clientLong & mask) >>> 0 === (networkLong & mask) >>> 0
}

// ─── Extract client IP from request ──────────────────────────────────────────

/**
 * Extract the real client IP from an Express request.
 * Handles:
 *   - x-forwarded-for header (proxies, reverse proxies, ngrok, etc.)
 *   - x-real-ip header
 *   - req.socket.remoteAddress
 *   - IPv6-mapped IPv4 addresses (::ffff:172.16.x.x)
 */
export function getClientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for']
  if (xff) {
    // x-forwarded-for can be a comma-separated list; first entry is the original client
    const first = Array.isArray(xff) ? xff[0] : xff.split(',')[0]
    const ip = first.trim()
    return normalizeIp(ip)
  }

  const realIp = req.headers['x-real-ip']
  if (realIp) {
    const ip = Array.isArray(realIp) ? realIp[0] : realIp
    return normalizeIp(ip.trim())
  }

  const remoteAddr = req.socket?.remoteAddress
  if (remoteAddr) return normalizeIp(remoteAddr)

  return null
}

/** Strip IPv6 mapping prefix: ::ffff:172.16.x.x → 172.16.x.x */
function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) return ip.substring(7)
  return ip
}

// ─── Network configuration ────────────────────────────────────────────────────

export interface NetworkConfig {
  hostelNetwork: string        // e.g. "172.16.0.0/20"
  collegeNetwork: string | null // e.g. "192.168.10.0/24" or null if not configured
}

export function getNetworkConfig(): NetworkConfig {
  const hostel  = process.env.HOSTEL_WIFI_NETWORK  ?? '172.16.0.0/20'
  const college = process.env.COLLEGE_WIFI_NETWORK ?? null
  return {
    hostelNetwork:  hostel,
    collegeNetwork: college && college !== '' && college !== 'NOT_CONFIGURED' ? college : null,
  }
}

// ─── High-level verification ──────────────────────────────────────────────────

export type NetworkLocation = 'HOSTEL' | 'COLLEGE' | 'OUTSIDE' | 'UNKNOWN'

export interface NetworkVerificationResult {
  location:       NetworkLocation
  verified:       boolean
  clientIp:       string | null
  message:        string
  hostelNetwork:  string
  collegeNetwork: string | null
}

/**
 * Main verification function.
 * Checks if the client IP belongs to the configured hostel or college network.
 *
 * IMPORTANT:
 * If the server is running on the same machine as the client (localhost dev),
 * req.socket.remoteAddress will be 127.0.0.1 or ::1.
 * In that case, we return UNKNOWN and let the frontend handle it gracefully.
 * This means in local development the camera is always available (for testing).
 *
 * In production (server deployed within the hostel network), the actual
 * client LAN IP will be visible, and the CIDR check will work correctly.
 */
export function getNetworkVerification(req: Request): NetworkVerificationResult {
  const config   = getNetworkConfig()
  const clientIp = getClientIp(req)

  if (!clientIp) {
    return {
      location: 'UNKNOWN', verified: false,
      clientIp: null,
      message: 'Could not determine client IP address.',
      hostelNetwork: config.hostelNetwork,
      collegeNetwork: config.collegeNetwork,
    }
  }

  // Localhost / dev environment — treat as HOSTEL so testing works
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
    return {
      location: 'HOSTEL', verified: true,
      clientIp,
      message: 'Development mode: localhost treated as hostel network.',
      hostelNetwork: config.hostelNetwork,
      collegeNetwork: config.collegeNetwork,
    }
  }

  // Check hostel network first
  if (isIpInNetwork(clientIp, config.hostelNetwork)) {
    return {
      location: 'HOSTEL', verified: true,
      clientIp,
      message: `Connected to hostel Wi-Fi network (${config.hostelNetwork}).`,
      hostelNetwork: config.hostelNetwork,
      collegeNetwork: config.collegeNetwork,
    }
  }

  // Check college network if configured
  if (config.collegeNetwork && isIpInNetwork(clientIp, config.collegeNetwork)) {
    return {
      location: 'COLLEGE', verified: true,
      clientIp,
      message: `Connected to college Wi-Fi network (${config.collegeNetwork}).`,
      hostelNetwork: config.hostelNetwork,
      collegeNetwork: config.collegeNetwork,
    }
  }

  return {
    location: 'OUTSIDE', verified: false,
    clientIp,
    message: `Not connected to the approved hostel Wi-Fi network (${config.hostelNetwork}). Connect to SVCE-GH Wi-Fi to mark attendance.`,
    hostelNetwork: config.hostelNetwork,
    collegeNetwork: config.collegeNetwork,
  }
}
