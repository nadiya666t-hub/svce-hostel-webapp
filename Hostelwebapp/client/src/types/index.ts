// ─── Auth ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  usn: string
  name: string
  role: 'STUDENT'
}

export interface LoginCredentials {
  usn: string
  password: string
}

export interface SetPasswordPayload {
  usn: string
  password: string
  confirmPassword: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
  requiresPasswordSetup: boolean
}

// ─── Student ─────────────────────────────────────────────────────────────────

export interface Student {
  id: string
  usn: string
  name: string
  email?: string
  phone?: string
  // Academic master (from foundation v2)
  course?: string
  branch?: string
  admissionYear?: number
  gender?: string
  dateOfBirth?: string
  // Parent
  parentName?: string
  parentPhone?: string
  parentEmail?: string
  // Address
  address?: string
  city?: string
  state?: string
  pinCode?: string
  // Health
  bloodGroup?: string
  // Hostel placement
  floorNumber: string
  roomNumber: string
  // Academic progress
  academicYear: string
  yearNumber?: number
  year: string
  semester: string
  semesterStartDate?: string
  semesterEndDate?: string
  // Status
  status?: string
  importSource?: string
  isActive: boolean
  createdAt: string
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE_PRESENT' | 'EXCUSED' | 'SPECIAL'
export type LocationVerification = 'VERIFIED' | 'UNVERIFIED'
export type WindowState = 'BEFORE' | 'OPEN' | 'CLOSED' | 'NO_WINDOW'

export interface AttendanceRecord {
  id: string
  date: string
  markedAt: string
  status: AttendanceStatus
  locationType: LocationVerification
  latitude?: number
  longitude?: number
  distanceFromHostel?: number
  photoUrl?: string
  isSpecialWindow: boolean
  specialWindowReason?: string
  excuseReason?: string
  window?: {
    startTime: string
    endTime: string
    isSpecial: boolean
  } | null
}

export interface AttendanceSummary {
  totalDays: number
  presentDays: number
  lateDays: number
  absentDays: number
  excusedDays: number
  percentage: number
  weeklyData: WeeklyAttendance[]
  monthlyData: MonthlyAttendance[]
}

export interface WeeklyAttendance {
  week: string
  present: number
  absent: number
  total: number
}

export interface MonthlyAttendance {
  month: string
  present: number
  absent: number
  total: number
}

export interface AttendanceWindowInfo {
  startTime: string
  endTime: string
  isSpecial?: boolean
  reason?: string | null
}

export interface AttendanceStatusResponse {
  serverTime: {
    iso: string
    istDisplay: string
    date: string
  }
  hostelLocation: {
    latitude: number
    longitude: number
    radiusMeters: number
  }
  window: {
    id: string
    startTime: string
    endTime: string
    isSpecial: boolean
    reason: string | null
  } | null
  windowState: WindowState
  alreadyMarked: boolean
  todayRecord: {
    status: AttendanceStatus
    markedAt: string
    locationType: LocationVerification
    distanceFromHostel: number | null
  } | null
}

export interface LocationVerificationResult {
  verified: boolean
  distance: number
  radiusMeters: number
  message: string
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export type RequestType = 'GOING_HOME' | 'OUTING' | 'LEAVE' | 'EMERGENCY_LEAVE' | 'OTHER'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface StudentRequest {
  id: string
  studentId: string
  type: RequestType
  fromDate: string
  toDate: string
  reason: string
  destination?: string
  additionalDetails?: string
  status: RequestStatus
  reviewNote?: string
  createdAt: string
  updatedAt: string
}

// ─── Problems ─────────────────────────────────────────────────────────────────

export type ProblemCategory = 'NO_WATER' | 'ELECTRICITY' | 'CLEANING' | 'PLUMBING' | 'FURNITURE' | 'WIFI' | 'OTHER'
export type ProblemStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'

export interface StudentProblem {
  id: string
  studentId: string
  category: ProblemCategory
  description: string
  photoUrl?: string
  roomNumber: string
  status: ProblemStatus
  createdAt: string
  updatedAt: string
}

// ─── Fees ─────────────────────────────────────────────────────────────────────

export interface FeeRecord {
  id: string
  studentId: string
  academicYear: string
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  dueDate: string
  payments: FeePayment[]
}

export interface FeePayment {
  id: string
  amount: number
  date: string
  reference: string
  status: 'SUCCESS' | 'PENDING' | 'FAILED'
  receiptUrl?: string
}

// ─── Notices ─────────────────────────────────────────────────────────────────

export type NoticePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Notice {
  id: string
  title: string
  description: string
  priority: NoticePriority
  createdAt: string
  category: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'ATTENDANCE_UPDATED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'PROBLEM_STATUS_CHANGED'
  | 'FEE_REMINDER'
  | 'IMPORTANT_NOTICE'

export interface Notification {
  id: string
  studentId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

// ─── Entry / Exit ─────────────────────────────────────────────────────────────

export type EntryExitStatus = 'IN' | 'OUT'

export interface EntryExitRecord {
  id: string
  studentId: string
  date: string
  entryTime?: string
  exitTime?: string
  status: EntryExitStatus
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
