import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../lib/Sidebar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export function Layout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Initialize global keyboard shortcuts (1-7 for navigation, [ or ⌘B for sidebar toggle, N for trade)
  useKeyboardShortcuts();

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    document.addEventListener('toggleMobileSidebar', handleToggle);
    return () => document.removeEventListener('toggleMobileSidebar', handleToggle);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full bg-[#f4f5f8] dark:bg-[#0d0d16] text-gray-900 dark:text-[#efecf9] overflow-hidden relative">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[45] md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      <Sidebar 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full max-w-full min-w-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-16 w-full max-w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
