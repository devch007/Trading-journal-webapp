import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  BarChart2, 
  BookOpen, 
  Activity, 
  Settings, 
  UserCircle,
  Wallet
} from "lucide-react";
import { cn } from "./utils";

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, path: "/", title: "Dashboard" },
    { icon: Wallet, path: "/accounts", title: "Accounts" },
    { icon: BarChart2, path: "/trades", title: "Trades" },
    { icon: BookOpen, path: "/journal", title: "Journal" },
    { icon: Activity, path: "/market", title: "Market" },
    { icon: Settings, path: "/settings", title: "Settings" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 border-r border-white/5 bg-[#0d0d16] flex flex-col items-center py-8 z-50">
      <div className="mb-12">
        <span className="text-indigo-400 font-bold text-xl drop-shadow-[0_0_8px_rgba(167,165,255,0.8)] font-headline">
          T
        </span>
      </div>
      <nav className="flex flex-col gap-8 flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.title}
              className={cn(
                "group relative flex items-center justify-center transition-colors duration-300 active:scale-90",
                isActive ? "text-[#3b82f6]" : "text-gray-500 hover:text-blue-300"
              )}
            >
              {isActive && (
                <div className="absolute left-[-24px] w-[3px] h-6 bg-[#3b82f6] rounded-r-full shadow-[4px_0_12px_rgba(59,130,246,0.5)]" />
              )}
              <item.icon className="w-6 h-6" />
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <Link
          to="/profile"
          title="Profile"
          className="text-gray-500 hover:text-indigo-300 transition-colors duration-300 active:scale-90 flex items-center justify-center"
        >
          <UserCircle className="w-6 h-6" />
        </Link>
      </div>
    </aside>
  );
}
