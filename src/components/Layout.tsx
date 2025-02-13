
import { Moon, Sun, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const location = useLocation();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
      document.documentElement.classList.toggle("light", savedTheme === "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    document.documentElement.classList.toggle("light", newTheme === "light");
  };

  const menuItems = [
    { path: "/", label: "Dashboard" },
    { path: "/transactions", label: "Transactions" },
    { path: "/budgets", label: "Budgets" },
    { path: "/reports", label: "Reports" },
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar-background border-b border-border flex items-center justify-between px-4 z-50">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <Menu className="h-6 w-6 text-sidebar-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-sidebar-foreground">ExpenseEden</h1>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-sidebar-background border-r border-border transform transition-transform duration-300 ease-in-out z-40 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ExpenseEden
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hidden lg:flex"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
        <nav className="p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded-lg mb-2 transition-all duration-200 ${
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-sidebar-foreground hover:bg-secondary"
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
