import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../lib/Sidebar';

export function Layout() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

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
    <div className="flex h-screen w-full bg-[#0d0d16] text-on-surface aurora-bg overflow-hidden relative">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      <Sidebar 
        isExpanded={isExpanded} 
        setIsExpanded={setIsExpanded}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
