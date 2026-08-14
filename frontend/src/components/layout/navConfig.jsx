import {
  GridIcon, UsersIcon, CalIcon, BookIcon, DoorIcon, DocIcon, ChartIcon,
  PlusIcon, SwapIcon,
} from '../icons'

export const ADMIN_NAV = [
  {
    section: null,
    items: [
      { to: '/admin/dashboard', label: 'Home', icon: <GridIcon />, end: true },
    ],
  },
  {
    section: 'Calendar & Timetable',
    items: [
      { to: '/admin/academic-calendar', label: 'Calendar & Day Order', icon: <CalIcon /> },
      { to: '/admin/timetable', label: 'Timetable', icon: <CalIcon /> },
      { to: '/admin/class-timetable', label: 'Classwise Timetable', icon: <CalIcon /> },
      { to: '/admin/timetable/approvals', label: 'Timetable Approvals', icon: <DocIcon /> },
      { to: '/admin/class-directory', label: 'Class Faculty Directory', icon: <UsersIcon /> },
      { to: '/admin/resource-availability', label: 'Room Availability', icon: <ChartIcon /> },
    ],
  },
  {
    section: 'Leave & Credits',
    items: [
      { to: '/admin/leaves', label: 'Leave Requests', icon: <DocIcon /> },
      { to: '/admin/leave-entry', label: 'Admin Leave Entry', icon: <PlusIcon /> },
      { to: '/admin/today-substitutions', label: "Today's Substitutions", icon: <DocIcon /> },
      { to: '/admin/credits', label: 'Credits', icon: <ChartIcon /> },
    ],
  },
  {
    section: 'Setup',
    items: [
      { to: '/admin/teachers', label: 'Teachers', icon: <UsersIcon /> },
      { to: '/admin/subjects', label: 'Subjects', icon: <BookIcon /> },
      { to: '/admin/classes', label: 'Classes', icon: <UsersIcon /> },
      { to: '/admin/rooms', label: 'Rooms & Labs', icon: <DoorIcon /> },
    ],
  },
]

export const TEACHER_NAV = [
  {
    section: 'Timetable & Classes',
    items: [
      { to: '/teacher/dashboard', label: 'Home', icon: <GridIcon />, end: true },
      { to: '/teacher/timetable', label: 'My Timetable', icon: <CalIcon /> },
      { to: '/teacher/class-timetable', label: 'Classwise Timetable', icon: <CalIcon /> },
    ],
  },

  {
    section: 'Leaves & Substitutions',
    items: [
      { to: '/teacher/leave/apply', label: 'Apply for Leave', icon: <PlusIcon /> },
      { to: '/teacher/leaves', label: 'Leave History', icon: <DocIcon /> },
      { to: '/teacher/substitution', label: 'Manage Substitutes', icon: <SwapIcon /> },
      { to: '/teacher/today-coverage', label: "Today's Coverage", icon: <DocIcon /> },
      { to: '/teacher/credits', label: 'My Credits', icon: <ChartIcon /> },
    ],
  },
]


export const SYSTEM_ADMIN_NAV = [
  {
    section: 'System Setup',
    items: [
      { to: '/admin/departments', label: 'Departments', icon: <UsersIcon />, end: true },
      { to: '/admin/managers', label: 'Managers', icon: <UsersIcon /> },
      { to: '/admin/classes', label: 'Classes', icon: <UsersIcon /> },
      { to: '/admin/rooms', label: 'Rooms & Labs', icon: <DoorIcon /> },
      { to: '/admin/teachers', label: 'Teachers', icon: <UsersIcon /> },
      { to: '/admin/subjects', label: 'Subjects', icon: <BookIcon /> },
    ],
  },
  {
    section: 'Performance',
    items: [
      { to: '/admin/system-metrics', label: 'Real-time Traffic', icon: <ChartIcon /> },
    ],
  },
]

export const MANAGER_NAV = [
  {
    section: null,
    items: [
      { to: '/manager/dashboard', label: 'Home', icon: <GridIcon />, end: true },
    ],
  },
  {
    section: 'Operational Staff',
    items: [
      { to: '/manager/lab-staff', label: 'Laboratory Staff', icon: <DoorIcon /> },
      { to: '/manager/non-teaching-staff', label: 'Non-Teaching Staff', icon: <UsersIcon /> },
      { to: '/manager/leaves', label: 'Staff Leaves & Ledger', icon: <DocIcon /> },
      { to: '/manager/directory', label: 'Staff Directory', icon: <BookIcon /> },
    ],
  },
]

export const PRINCIPAL_NAV = [
  {
    section: null,
    items: [
      { to: '/principal/dashboard', label: 'Home', icon: <GridIcon />, end: true },
      { to: '/principal/class-timetable', label: 'Classwise Timetable', icon: <CalIcon /> },
    ],
  },
]

export const STAFF_NAV = [
  {
    section: 'Workspace',
    items: [
      { to: '/staff/dashboard', label: 'Lab & Duty Workspace', icon: <GridIcon />, end: true },
    ],
  },
  {
    section: 'Leaves & Accounting',
    items: [
      { to: '/staff/leaves', label: 'My Leaves & Ledger', icon: <DocIcon /> },
    ],
  },
]




