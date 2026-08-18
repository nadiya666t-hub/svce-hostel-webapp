import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import HomePage from '@/pages/HomePage'
import StudentLoginPage from '@/pages/student/StudentLoginPage'
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
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import StudentLayout from '@/layouts/StudentLayout'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/student/login" element={<StudentLoginPage />} />
            <Route
              path="/student"
              element={
                <ProtectedRoute>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
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
              <Route path="settings"           element={<StudentSettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
