import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import MobileDrawer from './MobileDrawer'

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Lock body scroll when mobile drawer is open to prevent background scrolling
  useEffect(() => {
    if (drawerOpen) {
      document.body.classList.add('drawer-open')
    } else {
      document.body.classList.remove('drawer-open')
    }
    return () => {
      document.body.classList.remove('drawer-open')
    }
  }, [drawerOpen])

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-20 lg:pb-8">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav onMoreClick={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )

}
