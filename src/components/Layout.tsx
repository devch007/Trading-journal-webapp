import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../lib/Sidebar';

export function Layout() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#0d0d16] text-on-surface aurora-bg overflow-hidden">
      <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
      <main className={`flex-1 flex flex-col transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-16'} h-full overflow-hidden relative z-10`}>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
