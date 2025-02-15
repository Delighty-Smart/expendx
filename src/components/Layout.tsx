
import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Dashboard" },
    { path: "/transactions", label: "Transactions" },
    { path: "/budgets", label: "Budgets" },
    { path: "/reports", label: "Reports" },
    { path: "/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-effect border-b border-border/50 flex items-center justify-between px-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="animated-button"
        >
          <Menu className="h-6 w-6 text-foreground" />
        </Button>
        <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          ExpenseEden
        </h1>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 glass-effect border-r border-border/50 transform transition-all duration-300 ease-in-out z-40 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            ExpenseEden
          </h1>
        </div>
        <nav className="p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded-lg mb-2 transition-all duration-200 animated-button ${
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
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

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
