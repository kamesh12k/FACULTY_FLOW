# FAFLOW — Frontend Architecture Specification

This document details the frontend architecture, React 18 component hierarchy, routing guards, state management, and design system.

---

## 1. Technology Stack

- **Framework**: `React 18.2` (Functional Components with Hooks)
- **Build Tool**: `Vite 5.x` (Lightning-fast HMR and Rollup production builds)
- **Routing**: `react-router-dom v6`
- **Styling**: `Tailwind CSS 3.x` with custom `.sidebar-scrollbar` utilities
- **State Management**: React Context API (`AuthContext`, `DepartmentContext`, `ThemeContext`)
- **HTTP Client**: `axios` with global request/response interceptors

---

## 2. Component Hierarchy & Application Shell

```text
frontend/src/
├── App.jsx                          # Root Router & Context Providers
├── index.css                        # Global Styles, CSS Tokens & Responsive Breakpoints
│
├── context/                         # Global React Contexts
│   ├── AuthContext.jsx              # User session, JWT tokens, RBAC roles
│   ├── DepartmentContext.jsx        # Active department tenant context
│   └── ThemeContext.jsx             # Dark/Light/Preset branding themes
│
├── components/                      # Reusable UI Component Library
│   ├── layout/                      # Application Shell Components
│   │   ├── AppShell.jsx             # Master Viewport Shell (Static Sidebar, Scrolling Main)
│   │   ├── Sidebar.jsx              # Independent Scroll Sidebar with Pinned Footer
│   │   ├── TopBar.jsx               # Header with Live Date & Notifications
│   │   ├── BottomNav.jsx            # Mobile Sticky Navigation Bar
│   │   ├── MobileDrawer.jsx         # Full-Screen Mobile Drawer
│   │   └── navConfig.jsx            # Role-based Navigation Configuration
│   │
│   ├── ui/                          # Design System Tokens
│   │   ├── Button, Modal, Card, Badge, Spinner, Toast, EmptyState
│   │
│   └── icons/                       # Feather/Heroicon SVG Icons
│
├── routes/
│   └── Guards.jsx                   # Route Interceptors: RequireCredentialsSet, AdminRoute, ...
│
└── pages/                           # Role-based Page Views
    ├── auth/                        # Login, FirstLoginSetup
    ├── admin/                       # Dashboard, AcademicCalendar, Teachers, Timetable, ...
    ├── manager/                     # Dashboard, LabStaff, NonTeachingStaff, StaffLeaves, ...
    ├── staff/                       # Dashboard, Leaves
    ├── teacher/                     # Dashboard, Timetable, Credits, Leave, Substitution, ...
    └── common/                      # ClasswiseTimetable, TodaySubstitutions
```

---

## 3. Responsive Application Shell Design

FAFLOW incorporates a desktop/mobile dual layout model:
- **Desktop (≥ 1024px)**:
  - Layout locked to `h-screen overflow-hidden`.
  - **Static Sidebar**: Remains fixed on the left with independent `<nav>` scrolling and pinned user profile/sign-out footer.
  - **Static TopBar**: Pinned at the top of the content viewport.
  - **Scrolling Content**: `<main>` container operates as an isolated, high-performance vertical scroll container.
- **Mobile (< 1024px)**:
  - Header with hamburger trigger, bottom tab navigation (`BottomNav`), and full-height touch drawer (`MobileDrawer`).
