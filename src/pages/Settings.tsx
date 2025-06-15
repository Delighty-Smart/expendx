import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { currencies } from "@/lib/currencies";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Moon, Search, Sun, Palette, Tags, Archive, HardDrive, Settings as SettingsIcon, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryManagement } from "@/components/CategoryManagement";
import { ArchiveManagement } from "@/components/ArchiveManagement";
import { DebugSection } from "@/components/DebugSection";
import NotificationPreferences from "@/components/NotificationPreferences";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import "../components/ui/smoothScroll.css";
import DeleteAccountSection from "@/components/DeleteAccountSection";

const Settings = () => {
  const {
    currency,
    updateCurrency,
    theme,
    updateTheme
  } = useSettings();
  
  const { toast } = useToast();
  
  // Safely initialize useRefresh with error handling
  let refreshData;
  try {
    const refreshHook = useRefresh();
    refreshData = refreshHook.refreshData;
  } catch (error) {
    console.error("Error initializing refresh hook:", error);
    // Fallback refresh function
    refreshData = async () => {
      toast({
        title: "Refresh",
        description: "Page refreshed",
      });
      window.location.reload();
    };
  }
  
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
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
          </div>

          <Card className="glass-card">
            <Accordion 
              type="single" 
              collapsible 
              value={openSection}
              onValueChange={handleSectionChange}
              className="w-full"
            >
              <AccordionItem value="general" className="border-b">
                <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Palette className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">General Settings</div>
                      <div className="text-sm text-muted-foreground">Currency and theme preferences</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm md:text-base">Currency</Label>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search currencies..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="pl-9 h-9 md:h-10 text-sm"
                          />
                        </div>
                        <Select value={currency.code} onValueChange={handleCurrencyChange}>
                          <SelectTrigger className="h-9 md:h-10 text-sm">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent 
                            className="bg-popover text-popover-foreground backdrop-blur-lg"
                          >
                            <ScrollArea className="h-[200px]">
                              {filteredCurrencies.map(c => (
                                <SelectItem key={c.code} value={c.code} className="text-sm">
                                  {c.name} ({c.symbol})
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm md:text-base">Theme</Label>
                      <ToggleGroup 
                        type="single" 
                        value={theme} 
                        onValueChange={handleThemeChange}
                        className="justify-start"
                      >
                        <ToggleGroupItem 
                          value="light" 
                          aria-label="Light mode"
                          className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          <Sun className="h-4 w-4" />
                          Light Mode
                        </ToggleGroupItem>
                        <ToggleGroupItem 
                          value="dark" 
                          aria-label="Dark mode"
                          className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          <Moon className="h-4 w-4" />
                          Dark Mode
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="notifications" className="border-b">
                <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Notification Preferences</div>
                      <div className="text-sm text-muted-foreground">Manage your notification settings</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6">
                  <NotificationPreferences />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="categories" className="border-b">
                <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Tags className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Manage Categories</div>
                      <div className="text-sm text-muted-foreground">Create and organize transaction categories</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6">
                  <CategoryManagement />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="archive" className="border-b">
                <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Archive className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Archived Transactions</div>
                      <div className="text-sm text-muted-foreground">View and manage archived data</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6">
                  <ArchiveManagement />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="offline" className="border-b">
                <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Offline and Cache</div>
                      <div className="text-sm text-muted-foreground">Manage offline data storage and sync settings</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6">
                  <DebugSection />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delete-account" className="border-0">
                <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5 text-destructive" />
                    <div className="text-left">
                      <div className="font-medium text-destructive">Delete Your Account or Data</div>
                      <div className="text-sm text-muted-foreground">Permanently remove your account or data</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6">
                  <DeleteAccountSection />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default Settings;
