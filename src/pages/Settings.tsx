import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { currencies } from "@/lib/currencies";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Moon, Search, Sun, Palette, Shapes, Archive, HardDrive, Settings as SettingsIcon, Bell, Trash2, Download, ChevronRight, User, Fingerprint, TrendingUp, Sparkles } from "lucide-react";
import { FreshStartWizard } from "@/components/FreshStartWizard";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";
import { useBiometricLock } from "@/hooks/useBiometricLock";
import { LifeEnergySettings } from "@/components/LifeEnergySettings";
import PageHeader from "@/components/ui/page-header";

const Settings = () => {
  const {
    currency,
    updateCurrency,
    theme,
    updateTheme
  } = useSettings();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshData } = useRefresh();
  const { isBiometricEnabled, setBiometricEnabled, checkBiometricAvailability } = useBiometricLock();

  const [search, setSearch] = useState("");
  const [openSection, setOpenSection] = useState<string>("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(isBiometricEnabled());
  const [showFreshStart, setShowFreshStart] = useState(false);
  const isMobile = useIsMobile();


  // Auto-save search state to localStorage
  useEffect(() => {
    const savedSearch = localStorage.getItem('settings_currency_search');
    if (savedSearch) setSearch(savedSearch);

    const savedSection = localStorage.getItem('settings_open_section');
    if (savedSection) setOpenSection(savedSection);

    // Check biometric hardware availability on native
    if (Capacitor.isNativePlatform()) {
      checkBiometricAvailability().then(setBiometricAvailable);
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


  const handleBiometricToggle = (checked: boolean) => {
    setBiometricEnabled(checked);
    setBiometricOn(checked);
    toast({
      title: checked ? 'Biometric lock enabled' : 'Biometric lock disabled',
      description: checked ? 'The app will prompt fingerprint/face on resume.' : 'The app will open without biometric check.',
    });
  };

  return (
    <PullToRefresh onRefresh={refreshData} containerClassName="h-full min-h-[calc(100vh-100px)]">
      <div className="space-y-6 pb-24 min-h-full">
        <PageHeader title="Settings" backTo="/dashboard" />
        <div className="flex flex-col items-center text-center space-y-3 pt-4 pb-2">
          <div className="relative group cursor-pointer" onClick={() => navigate('/profile')}>
            <UserAvatar
              url={profile?.avatar_url}
              name={profile?.username || profile?.email || "User"}
              className="w-20 h-20 border-2 border-primary/20 shadow-xl"
              fallbackClassName="text-xl"
              showDefaultGradient={true}
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">{profile?.first_name || profile?.username || user?.email?.split('@')[0] || "User Settings"}</h2>
            <p className="text-xs text-muted-foreground font-medium">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-1 px-1">
          {/* Settings List */}
          {[
            { id: "general", label: "General & Theme", sub: "Currency and display settings", icon: Palette },
            { id: "life-energy", label: "Life Energy & Freedom", sub: "Calculate True Hourly Wage & Passive Income", icon: TrendingUp },
            { id: "notifications", label: "Notification Centre", sub: "Smart alerts and auto-tracking", icon: Bell },
            { id: "categories", label: "Financial Structure", sub: "Categories and organization", icon: Shapes },
            { id: "archive", label: "Data Archive", sub: "Review your history", icon: Archive },
            { id: "fresh-start", label: "Fresh Start", sub: "Reset balance without losing history", icon: Sparkles },
            { id: "offline", label: "Storage & Performance", sub: "Offline data and caching", icon: HardDrive },
            { id: "data-export", label: "Security & Export", sub: "Backup your records", icon: Download },
            ...(Capacitor.isNativePlatform() ? [{ id: "biometric", label: "Biometric Lock", sub: "Fingerprint or face unlock", icon: Fingerprint }] : []),
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

                      {item.id === "fresh-start" && (
                        <div className="space-y-4 p-1">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Have an unlogged gap in your expenses or want a clean financial slate? Launch Fresh Start to align your app balance with your bank account without wiping out your past charts.
                          </p>
                          <Button
                            onClick={() => setShowFreshStart(true)}
                            className="rounded-xl font-bold text-xs gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <Sparkles className="h-4 w-4" /> Launch Fresh Start
                          </Button>
                        </div>
                      )}
                      {item.id === "life-energy" && <LifeEnergySettings />}
                      {item.id === "notifications" && <NotificationPreferences />}
                      {item.id === "categories" && <CategoryManagement />}
                      {item.id === "archive" && <ArchiveManagement />}
                      {item.id === "offline" && <DebugSection />}
                      {item.id === "data-export" && <DataExportSection />}
                      {item.id === "delete-account" && <DeleteAccountSection />}
                      {item.id === "biometric" && (
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Lock the app with fingerprint or face recognition when you return from the background.
                          </p>
                          {biometricAvailable ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/40">
                              <div className="flex items-center gap-3">
                                <Fingerprint className="h-5 w-5 text-primary" strokeWidth={1.5} />
                                <div>
                                  <p className="text-sm font-semibold">Biometric Lock</p>
                                  <p className="text-xs text-muted-foreground">{biometricOn ? 'Active — prompts on resume' : 'Disabled'}</p>
                                </div>
                              </div>
                              <Switch
                                checked={biometricOn}
                                onCheckedChange={handleBiometricToggle}
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-3">
                              ⚠️ Biometric authentication is not available on this device.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <FreshStartWizard
        open={showFreshStart}
        onOpenChange={setShowFreshStart}
        calculatedBalance={enhancedOfflineManager.getTransactionSummary().balance}
      />
    </PullToRefresh>
  );
};

export default Settings;

