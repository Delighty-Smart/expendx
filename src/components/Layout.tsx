
import { ArrowLeft, Menu } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Dashboard" },
    { path: "/transactions", label: "Transactions" },
    { path: "/budgets", label: "Budgets" },
    { path: "/reports", label: "Reports" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="h-6 w-6 text-neutral" />
        </button>
        <h1 className="text-lg font-semibold text-neutral">ExpenseEden</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-40 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <h1 className="text-xl font-bold text-neutral">ExpenseEden</h1>
        </div>
        <nav className="p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded-lg mb-2 transition-colors ${
                location.pathname === item.path
                  ? "bg-primary text-white"
                  : "text-neutral hover:bg-gray-100"
              }`}
              onClick={() => setIsSidebarOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`pt-16 lg:pl-64 min-h-screen transition-all duration-300 ${
          isSidebarOpen ? "brightness-50 lg:brightness-100" : ""
        }`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div className="container mx-auto p-4 lg:p-8 animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
