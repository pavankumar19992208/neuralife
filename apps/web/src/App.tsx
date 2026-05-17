import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'
import WelcomePage from '@/pages/Welcome/WelcomePage'
import { Button } from '@/components/ui/button'
import { UserRole } from '@/types/common'

const LoginPage      = lazy(() => import('@/pages/Login/LoginPage'))
const OTPVerifyPage  = lazy(() => import('@/pages/Login/OTPVerifyPage'))
const DashboardPage  = lazy(() => import('@/pages/Dashboard/DashboardPage'))
const StudentsPage        = lazy(() => import('@/pages/Students/StudentsPage'))
const StudentProfilePage  = lazy(() => import('@/pages/Students/StudentProfilePage'))
const TeachersPage        = lazy(() => import('@/pages/Teachers/TeachersPage'))
const TeacherProfilePage  = lazy(() => import('@/pages/Teachers/TeacherProfilePage'))
const AttendancePage = lazy(() => import('@/pages/Attendance/AttendancePage'))
const AttendanceAnalyticsPage = lazy(() => import('@/pages/Attendance/AttendanceAnalyticsPage'))
const ExamsPage         = lazy(() => import('@/pages/Exams/ExamsPage'))
const ExamDetailPage    = lazy(() => import('@/pages/Exams/ExamDetailPage'))
const MarksEntryPage    = lazy(() => import('@/pages/Exams/MarksEntryPage'))
const ReportCardPage    = lazy(() => import('@/pages/Exams/ReportCardPage'))
const FeesPage            = lazy(() => import('@/pages/Fees/FeesPage'))
const FeeAnalyticsPage    = lazy(() => import('@/pages/Fees/FeeAnalyticsPage'))
const SalaryPage     = lazy(() => import('@/pages/Salary/SalaryPage'))
const FleetPage      = lazy(() => import('@/pages/Fleet/FleetPage'))
const AnalyticsPage  = lazy(() => import('@/pages/Analytics/AnalyticsPage'))
const SpherePage     = lazy(() => import('@/pages/Sphere/SpherePage'))
const SettingsPage        = lazy(() => import('@/pages/Settings/SettingsPage'))
const ContentStudioPage   = lazy(() => import('@/pages/ContentStudio/ContentStudioPage'))
const TimetablePage       = lazy(() => import('@/pages/Timetable/TimetablePage'))

function PageSpinner() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: '#020817' }}
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-4"
        style={{ borderColor: 'rgba(30,64,175,0.25)', borderTopColor: '#1e40af' }}
      />
    </div>
  )
}

function UnauthorizedPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-slate-500">You don't have permission to view this page.</p>
        <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Splash */}
        <Route path="/"       element={<WelcomePage />} />
        <Route path="/welcome" element={<WelcomePage />} />

        {/* Public auth */}
        <Route path="/login"        element={<LoginPage />} />
        <Route path="/otp-verify"   element={<OTPVerifyPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected routes — wrapped in AppShell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/students" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]}>
                <StudentsPage />
              </ProtectedRoute>
            } />
            <Route path="/students/:neuraId" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT]}>
                <StudentProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/teachers" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]}>
                <TeachersPage />
              </ProtectedRoute>
            } />
            <Route path="/teachers/:teacherId" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]}>
                <TeacherProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]}>
                <AttendancePage />
              </ProtectedRoute>
            } />
            <Route path="/attendance/analytics" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]}>
                <AttendanceAnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/exams" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]}>
                <ExamsPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/:examId" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]}>
                <ExamDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/:examId/marks" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]}>
                <MarksEntryPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/:examId/report-card/:neuraId" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]}>
                <ReportCardPage />
              </ProtectedRoute>
            } />
            <Route path="/fees" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]}>
                <FeesPage />
              </ProtectedRoute>
            } />
            <Route path="/fees/analytics" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]}>
                <FeeAnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/salary" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL]}>
                <SalaryPage />
              </ProtectedRoute>
            } />
            <Route path="/fleet" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL]}>
                <FleetPage />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL]}>
                <AnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/sphere" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL]}>
                <SpherePage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL]}>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/timetable" element={
              <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]}>
                <TimetablePage />
              </ProtectedRoute>
            } />
          </Route>
        </Route>

        {/* Content Studio — standalone, no AppShell */}
        <Route path="/content-studio" element={<ContentStudioPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
