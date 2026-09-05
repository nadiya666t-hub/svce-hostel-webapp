import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ParentAuthProvider } from '@/hooks/useParentAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import HomePage from '@/pages/HomePage'
// Student
import StudentLoginPage from '@/pages/student/StudentLoginPage'
import PhotoEnrollmentPage from '@/pages/student/PhotoEnrollmentPage'
import StudentDashboardPage from '@/pages/student/StudentDashboardPage'
import StudentProfilePage from '@/pages/student/StudentProfilePage'
import StudentAttendancePage from '@/pages/student/StudentAttendancePage'
import StudentRequestsPage from '@/pages/student/StudentRequestsPage'
import StudentProblemsPage from '@/pages/student/StudentProblemsPage'
import StudentFeesPage from '@/pages/student/StudentFeesPage'
import StudentNoticesPage from '@/pages/student/StudentNoticesPage'
import StudentNotificationsPage from '@/pages/student/StudentNotificationsPage'
import StudentSettingsPage from '@/pages/student/StudentSettingsPage'
import StudentEmergencyContactsPage from '@/pages/student/StudentEmergencyContactsPage'
import StudentEntryExitPage from '@/pages/student/StudentEntryExitPage'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import StudentLayout from '@/layouts/StudentLayout'
// Parent
import ParentLoginPage from '@/pages/parent/ParentLoginPage'
import ParentDashboardPage from '@/pages/parent/ParentDashboardPage'
import ParentAttendancePage from '@/pages/parent/ParentAttendancePage'
import ParentFeesPage from '@/pages/parent/ParentFeesPage'
import ParentOutgoingPage from '@/pages/parent/ParentOutgoingPage'
import ParentContactsPage from '@/pages/parent/ParentContactsPage'
import ParentProtectedRoute from '@/components/auth/ParentProtectedRoute'
import ParentLayout from '@/layouts/ParentLayout'
// Warden
import WardenLoginPage from '@/pages/warden/WardenLoginPage'
import WardenDashboardPage from '@/pages/warden/WardenDashboardPage'
import WardenStudentsPage from '@/pages/warden/WardenStudentsPage'
import WardenRoomsPage from '@/pages/warden/WardenRoomsPage'
import WardenRequestsPage from '@/pages/warden/WardenRequestsPage'
import WardenProblemsPage from '@/pages/warden/WardenProblemsPage'
import WardenAttendancePage from '@/pages/warden/WardenAttendancePage'
import WardenSpecialAccessPage from '@/pages/warden/WardenSpecialAccessPage'
import WardenAnnouncementsPage from '@/pages/warden/WardenAnnouncementsPage'
import WardenEmergencyContactsPage from '@/pages/warden/WardenEmergencyContactsPage'
import WardenProfilePage from '@/pages/warden/WardenProfilePage'
import WardenNoticesPage from '@/pages/warden/WardenNoticesPage'
import WardenFeesPage from '@/pages/warden/WardenFeesPage'
import WardenWindowsPage from '@/pages/warden/WardenWindowsPage'
import WardenProtectedRoute from '@/components/auth/WardenProtectedRoute'
import WardenLayout from '@/layouts/WardenLayout'
import { WardenAuthProvider } from '@/hooks/useWardenAuth'
// Overseer
import OverseerLoginPage from '@/pages/overseer/OverseerLoginPage'
import OverseerDashboardPage from '@/pages/overseer/OverseerDashboardPage'
import OverseerProblemsPage from '@/pages/overseer/OverseerProblemsPage'
import OverseerProblemDetailPage from '@/pages/overseer/OverseerProblemDetailPage'
import OverseerProfilePage from '@/pages/overseer/OverseerProfilePage'
import OverseerProtectedRoute from '@/components/auth/OverseerProtectedRoute'
import OverseerLayout from '@/layouts/OverseerLayout'
import { OverseerAuthProvider } from '@/hooks/useOverseerAuth'
// Watchman
import WatchmanLoginPage from '@/pages/watchman/WatchmanLoginPage'
import WatchmanDashboardPage from '@/pages/watchman/WatchmanDashboardPage'
import WatchmanLateEntriesPage from '@/pages/watchman/WatchmanLateEntriesPage'
import WatchmanInstructionsPage from '@/pages/watchman/WatchmanInstructionsPage'
import WatchmanProfilePage from '@/pages/watchman/WatchmanProfilePage'
import WatchmanProtectedRoute from '@/components/auth/WatchmanProtectedRoute'
import WatchmanLayout from '@/layouts/WatchmanLayout'
import { WatchmanAuthProvider } from '@/hooks/useWatchmanAuth'
// Admin
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminStudentsPage from '@/pages/admin/AdminStudentsPage'
import AdminAttendancePage from '@/pages/admin/AdminAttendancePage'
import AdminNoticesPage from '@/pages/admin/AdminNoticesPage'
import AdminNotificationsPage from '@/pages/admin/AdminNotificationsPage'
import AdminRoomsPage from '@/pages/admin/AdminRoomsPage'
import AdminProfilePage from '@/pages/admin/AdminProfilePage'
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute'
import AdminLayout from '@/layouts/AdminLayout'
import { AdminAuthProvider } from '@/hooks/useAdminAuth'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ParentAuthProvider>
            <WardenAuthProvider>
            <OverseerAuthProvider>
            <WatchmanAuthProvider>
            <AdminAuthProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />

              {/* ── Student ── */}
              <Route path="/student/login" element={<StudentLoginPage />} />
              <Route path="/student/enroll" element={<ProtectedRoute><PhotoEnrollmentPage /></ProtectedRoute>} />
              <Route path="/student" element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/student/dashboard" replace />} />
                <Route path="dashboard"          element={<StudentDashboardPage />} />
                <Route path="profile"            element={<StudentProfilePage />} />
                <Route path="attendance"         element={<StudentAttendancePage />} />
                <Route path="requests"           element={<StudentRequestsPage />} />
                <Route path="problems"           element={<StudentProblemsPage />} />
                <Route path="fees"               element={<StudentFeesPage />} />
                <Route path="notices"            element={<StudentNoticesPage />} />
                <Route path="notifications"      element={<StudentNotificationsPage />} />
                <Route path="emergency-contacts" element={<StudentEmergencyContactsPage />} />
                <Route path="entry-exit"         element={<StudentEntryExitPage />} />
                <Route path="settings"           element={<StudentSettingsPage />} />
              </Route>

              {/* ── Parent ── */}
              <Route path="/parent/login" element={<ParentLoginPage />} />
              <Route path="/parent" element={<ParentProtectedRoute><ParentLayout /></ParentProtectedRoute>}>
                <Route index element={<Navigate to="/parent/dashboard" replace />} />
                <Route path="dashboard"  element={<ParentDashboardPage />} />
                <Route path="attendance" element={<ParentAttendancePage />} />
                <Route path="fees"       element={<ParentFeesPage />} />
                <Route path="outgoing"   element={<ParentOutgoingPage />} />
                <Route path="contacts"   element={<ParentContactsPage />} />
              </Route>

              {/* ── Warden ── */}
              <Route path="/warden/login" element={<WardenLoginPage />} />
              <Route path="/warden" element={<WardenProtectedRoute><WardenLayout /></WardenProtectedRoute>}>
                <Route index element={<Navigate to="/warden/dashboard" replace />} />
                <Route path="dashboard"          element={<WardenDashboardPage />} />
                <Route path="students"           element={<WardenStudentsPage />} />
                <Route path="rooms"              element={<WardenRoomsPage />} />
                <Route path="requests"           element={<WardenRequestsPage />} />
                <Route path="problems"           element={<WardenProblemsPage />} />
                <Route path="attendance"         element={<WardenAttendancePage />} />
                <Route path="special-access"     element={<WardenSpecialAccessPage />} />
                <Route path="announcements"      element={<WardenAnnouncementsPage />} />
                <Route path="emergency-contacts" element={<WardenEmergencyContactsPage />} />
                <Route path="profile"            element={<WardenProfilePage />} />
                <Route path="notices"            element={<WardenNoticesPage />} />
                <Route path="fees"               element={<WardenFeesPage />} />
                <Route path="windows"            element={<WardenWindowsPage />} />
              </Route>

              {/* ── Overseer ── */}
              <Route path="/overseer/login" element={<OverseerLoginPage />} />
              <Route path="/overseer" element={<OverseerProtectedRoute><OverseerLayout /></OverseerProtectedRoute>}>
                <Route index element={<Navigate to="/overseer/dashboard" replace />} />
                <Route path="dashboard" element={<OverseerDashboardPage />} />
                <Route path="problems"  element={<OverseerProblemsPage />} />
                <Route path="problems/:id" element={<OverseerProblemDetailPage />} />
                <Route path="profile"   element={<OverseerProfilePage />} />
              </Route>

              {/* ── Watchman ── */}
              <Route path="/watchman/login" element={<WatchmanLoginPage />} />
              <Route path="/watchman" element={<WatchmanProtectedRoute><WatchmanLayout /></WatchmanProtectedRoute>}>
                <Route index element={<Navigate to="/watchman/dashboard" replace />} />
                <Route path="dashboard"    element={<WatchmanDashboardPage />} />
                <Route path="late-entries" element={<WatchmanLateEntriesPage />} />
                <Route path="instructions" element={<WatchmanInstructionsPage />} />
                <Route path="profile"      element={<WatchmanProfilePage />} />
              </Route>

              {/* ── Admin ── */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard"     element={<AdminDashboardPage />} />
                <Route path="students"      element={<AdminStudentsPage />} />
                <Route path="attendance"    element={<AdminAttendancePage />} />
                <Route path="notices"       element={<AdminNoticesPage />} />
                <Route path="notifications" element={<AdminNotificationsPage />} />
                <Route path="rooms"         element={<AdminRoomsPage />} />
                <Route path="profile"       element={<AdminProfilePage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AdminAuthProvider>
          </WatchmanAuthProvider>
          </OverseerAuthProvider>
          </WardenAuthProvider>
          </ParentAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
