import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DepartmentProvider } from './context/DepartmentContext'
import { ProtectedRoute, AdminRoute, PrincipalRoute, GovernanceRoute, ManagerRoute, StaffRoute, TeacherRoute, GuestRoute, FirstLoginSetupRoute, RequireCredentialsSet } from './routes/Guards'
import AppShell from './components/layout/AppShell'

// Auth pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import FirstLoginSetup from './pages/auth/FirstLoginSetup'

// Governance Command Center
import GovernanceDashboard from './pages/governance/Dashboard'


// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import Teachers from './pages/admin/Teachers'
import AdminManagers from './pages/admin/Managers'
import AdminTimetable from './pages/admin/Timetable'
import TimetableApprovals from './pages/admin/TimetableApprovals'
import AdminLeaves from './pages/admin/Leaves'
import AdminLeaveEntry from './pages/admin/AdminLeaveEntry'
import AdminCredits from './pages/admin/credits/index'
import AdminSubjects from './pages/admin/Subjects'
import AdminClasses from './pages/admin/Classes'
import AdminRooms from './pages/admin/Rooms'
import AdminDepartments from './pages/admin/Departments'
import ResourceAvailability from './pages/admin/ResourceAvailability'
import AdminSettings from './pages/admin/Settings'
import AcademicCalendar from './pages/admin/AcademicCalendar'
import AcademicCalendarReports from './pages/admin/AcademicCalendarReports'
import SystemMetrics from './pages/admin/SystemMetrics'
import BackupRestore from './pages/admin/Backup'
import DataRetention from './pages/admin/DataRetention'

// Principal pages
import PrincipalDashboard from './pages/admin/PrincipalDashboard'

// Manager pages
import ManagerDashboard from './pages/manager/Dashboard'
import ManagerLabStaff from './pages/manager/LabStaff'
import ManagerNonTeachingStaff from './pages/manager/NonTeachingStaff'
import ManagerStaffDirectory from './pages/manager/StaffDirectory'
import ManagerStaffLeaves from './pages/manager/StaffLeaves'

// Staff pages
import StaffDashboard from './pages/staff/Dashboard'
import StaffMyLeaves from './pages/staff/Leaves'


// Common pages

import TodaySubstitutions from './pages/common/TodaySubstitutions'
import ClassFacultyDirectory from './pages/common/ClassFacultyDirectory'
import ClasswiseTimetable from './pages/common/ClasswiseTimetable'

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard'
import MyTimetable from './pages/teacher/Timetable'
import ApplyLeave from './pages/teacher/ApplyLeave'
import LeaveHistory from './pages/teacher/LeaveHistory'
import MyCredits from './pages/teacher/Credits'
import SubstitutionPreferences from './pages/teacher/Preferences'
import TeacherSubstitution from './pages/teacher/Substitution'
import ScrollToTop from './components/common/ScrollToTop'

import { ToastProvider } from './components/ui/Toast'

export default function App() {
  return (
    <AuthProvider>
    <DepartmentProvider>
    <ToastProvider>
      <ScrollToTop />
      <Routes>
        {/* Public / guest routes */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* First-login credential setup — explicit gate before the normal dashboard routes */}
        <Route element={<FirstLoginSetupRoute />}>
          <Route path="/first-login-setup" element={<FirstLoginSetup />} />
        </Route>

        {/* Admin routes — RequireCredentialsSet bounces anyone still on
            default/reset credentials to /first-login-setup before they can
            reach any of these */}
        <Route element={<AdminRoute />}>
          <Route element={<RequireCredentialsSet />}>
            <Route element={<AppShell />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/academic-calendar" element={<AcademicCalendar />} />
              <Route path="/admin/academic-calendar/reports" element={<AcademicCalendarReports />} />
              <Route path="/admin/teachers" element={<Teachers />} />
              <Route path="/admin/managers" element={<AdminManagers />} />
              <Route path="/admin/timetable" element={<AdminTimetable />} />
              <Route path="/admin/timetable/approvals" element={<TimetableApprovals />} />
              <Route path="/admin/leaves" element={<AdminLeaves />} />
              <Route path="/admin/leave-entry" element={<AdminLeaveEntry />} />
              <Route path="/admin/credits" element={<AdminCredits />} />
              <Route path="/admin/subjects" element={<AdminSubjects />} />
              <Route path="/admin/classes" element={<AdminClasses />} />
              <Route path="/admin/class-directory" element={<ClassFacultyDirectory />} />
              <Route path="/admin/class-timetable" element={<ClasswiseTimetable />} />
              <Route path="/admin/departments" element={<AdminDepartments />} />
              <Route path="/admin/rooms" element={<AdminRooms />} />
              <Route path="/admin/resource-availability" element={<ResourceAvailability />} />
              <Route path="/admin/today-substitutions" element={<TodaySubstitutions />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/system-metrics" element={<SystemMetrics />} />
              <Route path="/admin/backup" element={<BackupRestore />} />
              <Route path="/admin/data-retention" element={<DataRetention />} />
            </Route>
          </Route>
        </Route>

        {/* Governance routes — Command Center & Emergency Controls */}
        <Route element={<GovernanceRoute />}>
          <Route element={<RequireCredentialsSet />}>
            <Route element={<AppShell />}>
              <Route path="/governance" element={<GovernanceDashboard />} />
            </Route>
          </Route>
        </Route>

        {/* Principal routes — read-only college-wide view */}
        <Route element={<PrincipalRoute />}>
          <Route element={<RequireCredentialsSet />}>
            <Route element={<AppShell />}>
              <Route path="/principal/dashboard" element={<PrincipalDashboard />} />
              <Route path="/principal/class-timetable" element={<ClasswiseTimetable />} />
            </Route>
          </Route>
        </Route>

        {/* Manager routes — Operational, Lab and Non-teaching staff */}
        <Route element={<ManagerRoute />}>
          <Route element={<RequireCredentialsSet />}>
            <Route element={<AppShell />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route path="/manager/lab-staff" element={<ManagerLabStaff />} />
              <Route path="/manager/non-teaching-staff" element={<ManagerNonTeachingStaff />} />
              <Route path="/manager/leaves" element={<ManagerStaffLeaves />} />
              <Route path="/manager/directory" element={<ManagerStaffDirectory />} />
            </Route>
          </Route>
        </Route>

        {/* Staff routes — Laboratory & Non-Teaching Staff Portal */}
        <Route element={<StaffRoute />}>
          <Route element={<RequireCredentialsSet />}>
            <Route element={<AppShell />}>
              <Route path="/staff/dashboard" element={<StaffDashboard />} />
              <Route path="/staff/leaves" element={<StaffMyLeaves />} />
            </Route>
          </Route>
        </Route>


        {/* Teacher routes */}
        <Route element={<TeacherRoute />}>

          <Route element={<RequireCredentialsSet />}>
            <Route element={<AppShell />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/timetable" element={<MyTimetable />} />
              <Route path="/teacher/class-timetable" element={<ClasswiseTimetable />} />
              <Route path="/teacher/leave/apply" element={<ApplyLeave />} />

              <Route path="/teacher/leaves" element={<LeaveHistory />} />
              <Route path="/teacher/substitution" element={<TeacherSubstitution />} />
              <Route path="/teacher/today-coverage" element={<TodaySubstitutions />} />
              <Route path="/teacher/credits" element={<MyCredits />} />
              <Route path="/teacher/preferences" element={<SubstitutionPreferences />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ToastProvider>
    </DepartmentProvider>
    </AuthProvider>
  )
}
