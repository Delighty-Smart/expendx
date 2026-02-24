import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { currencies } from "@/lib/currencies";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Moon, Search, Sun, Palette, Shapes, Archive, HardDrive, Settings as SettingsIcon, Bell, Trash2, Download, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { CategoryManagement } from "@/components/CategoryManagement";
import { ArchiveManagement } from "@/components/ArchiveManagement";
import { DebugSection } from "@/components/DebugSection";
import NotificationPreferences from "@/components/NotificationPreferences";
import DataExportSection from "@/components/DataExportSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import "../components/ui/smoothScroll.css";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import { cn } from "@/lib/utils";

const Settings = () => {
  const {
    currency,
    updateCurrency,
    theme,
    updateTheme
  } = useSettings();
  const { user } = useAuth();


  const { toast } = useToast();
  const { refreshData } = useRefresh();

  const [search, setSearch] = useState("");
  const [openSection, setOpenSection] = useState<string>("");
  const isMobile = useIsMobile();


  // Auto-save search state to localStorage
  useEffect(() => {
    const savedSearch = localStorage.getItem('settings_currency_search');
    if (savedSearch) {
      setSearch(savedSearch);
    }



    // Load last opened section
    const savedSection = localStorage.getItem('settings_open_section');
    if (savedSection) {
      setOpenSection(savedSection);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('settings_currency_search', search);
  }, [search]);

  // Save opened section to localStorage
  const handleSectionChange = (value: string) => {
    setOpenSection(value);
    localStorage.setItem('settings_open_section', value);
  };


  const filteredCurrencies = currencies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );


  const handleCurrencyChange = async (code: string) => {
    try {
      await updateCurrency(code);
      toast({
        title: "Currency updated",
        description: `Currency changed to ${currencies.find(c => c.code === code)?.name}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };



  const handleThemeChange = (newTheme: string) => {
    if (newTheme === "light" || newTheme === "dark") {
      updateTheme(newTheme);
      toast({
        title: "Theme updated",
        description: `Theme switched to ${newTheme} mode.`
      });
    }
  };


  return (
    <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
      <div className="space-y-6 pb-24">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-3 pt-4 pb-2">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent flex items-center justify-center border-2 border-primary/20 shadow-xl overflow-hidden backdrop-blur-sm">
              <User className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">{user?.email?.split('@')[0] || "User Settings"}</h2>
            <p className="text-xs text-muted-foreground font-medium">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-1 px-1">
          {/* Settings List */}
          {[
            { id: "general", label: "General & Theme", sub: "Currency and display settings", icon: Palette },
            { id: "notifications", label: "Notification Centre", sub: "Smart alerts and auto-tracking", icon: Bell },
            { id: "categories", label: "Financial Structure", sub: "Categories and organization", icon: Shapes },
            { id: "archive", label: "Data Archive", sub: "Review your history", icon: Archive },
            { id: "offline", label: "Storage & Performance", sub: "Offline data and caching", icon: HardDrive },
            { id: "data-export", label: "Security & Export", sub: "Backup your records", icon: Download },
            { id: "delete-account", label: "Account Privacy", sub: "Manage account and data", icon: Trash2, destructive: true },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = openSection === item.id;

            return (
              <div key={item.id} className="space-y-2">
                <button
                  onClick={() => handleSectionChange(isActive ? "" : item.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group",
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-xl transition-colors duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : item.destructive
                        ? "bg-red-500/10 text-red-500"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className={cn(
                      "font-bold text-sm transition-colors",
                      isActive ? "text-primary" : item.destructive ? "text-red-500" : "text-foreground"
                    )}>
                      {item.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.sub}</div>
                  </div>

                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    isActive ? "rotate-90 text-primary" : "text-muted-foreground/50"
                  )} />
                </button>

                {isActive && (
                  <div className="px-2 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-muted/30 rounded-2xl p-4 border border-border/40 backdrop-blur-sm">
                      {item.id === "general" && (
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Select Currency</Label>
                            <div className="space-y-3">
                              <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                                <Input
                                  placeholder="Search currencies..."
                                  value={search}
                                  onChange={e => setSearch(e.target.value)}
                                  className="pl-9 h-10 text-sm bg-background/50 border-none shadow-inner"
                                />
                              </div>
                              <Select value={currency.code} onValueChange={handleCurrencyChange}>
                                <SelectTrigger className="h-10 text-sm bg-background/50 border-none">
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover/80 backdrop-blur-xl border-border/50">
                                  <ScrollArea className="h-[200px]">
                                    {filteredCurrencies.map(c => (
                                      <SelectItem key={c.code} value={c.code}>
                                        {c.name} ({c.symbol})
                                      </SelectItem>
                                    ))}
                                  </ScrollArea>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <Label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Appearance</Label>
                            <ToggleGroup
                              type="single"
                              value={theme}
                              onValueChange={handleThemeChange}
                              className="justify-start bg-background/50 p-1 rounded-full inline-flex border border-border/40"
                            >
                              <ToggleGroupItem
                                value="light"
                                className="flex items-center gap-2 px-4 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all h-8 text-xs font-bold"
                              >
                                <Sun className="h-3.5 w-3.5" /> Light
                              </ToggleGroupItem>
                              <ToggleGroupItem
                                value="dark"
                                className="flex items-center gap-2 px-4 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all h-8 text-xs font-bold"
                              >
                                <Moon className="h-3.5 w-3.5" /> Dark
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </div>
                        </div>
                      )}

                      {item.id === "notifications" && <NotificationPreferences />}
                      {item.id === "categories" && <CategoryManagement />}
                      {item.id === "archive" && <ArchiveManagement />}
                      {item.id === "offline" && <DebugSection />}
                      {item.id === "data-export" && <DataExportSection />}
                      {item.id === "delete-account" && <DeleteAccountSection />}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PullToRefresh>
  );
};

export default Settings;

