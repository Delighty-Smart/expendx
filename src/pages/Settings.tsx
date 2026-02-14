import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { currencies } from "@/lib/currencies";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Moon, Search, Sun, Palette, Shapes, Archive, HardDrive, Settings as SettingsIcon, Bell, Trash2 } from "lucide-react";
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
<<<<<<< HEAD

  const { toast } = useToast();
  const { refreshData } = useRefresh();

  const [search, setSearch] = useState("");
  const [openSection, setOpenSection] = useState<string>("");
  const isMobile = useIsMobile();

=======
  
  const { toast } = useToast();
  const { refreshData } = useRefresh();
  
  const [search, setSearch] = useState("");
  const [openSection, setOpenSection] = useState<string>("");
  const isMobile = useIsMobile();
  
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
  // Auto-save search state to localStorage
  useEffect(() => {
    const savedSearch = localStorage.getItem('settings_currency_search');
    if (savedSearch) {
      setSearch(savedSearch);
    }
<<<<<<< HEAD

=======
    
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
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
<<<<<<< HEAD

  const filteredCurrencies = currencies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

=======
  
  const filteredCurrencies = currencies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );
  
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
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
<<<<<<< HEAD

=======
  
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
  const handleThemeChange = (newTheme: string) => {
    if (newTheme === "light" || newTheme === "dark") {
      updateTheme(newTheme);
      toast({
        title: "Theme updated",
        description: `Theme switched to ${newTheme} mode.`
      });
    }
  };
<<<<<<< HEAD

  return (
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
        <div className="space-y-6 pb-24">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" strokeWidth={1.5} />
=======
  
  return (
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
            <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
          </div>

          <Card className="glass-card">
<<<<<<< HEAD
            <Accordion
              type="single"
              collapsible
=======
            <Accordion 
              type="single" 
              collapsible 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
              value={openSection}
              onValueChange={handleSectionChange}
              className="w-full"
            >
              <AccordionItem value="general" className="border-b">
<<<<<<< HEAD
                <AccordionTrigger className="px-4 md:px-6 py-5 hover:no-underline hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Palette className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-base md:text-lg">General Settings</div>
                      <div className="text-sm text-muted-foreground mt-0.5">Currency and theme preferences</div>
=======
                <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Palette className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">General Settings</div>
                      <div className="text-sm text-muted-foreground">Currency and theme preferences</div>
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm md:text-base">Currency</Label>
                      <div className="space-y-4">
                        <div className="relative">
<<<<<<< HEAD
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                          <Input
                            placeholder="Search currencies..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
=======
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search currencies..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
                            className="pl-9 h-9 md:h-10 text-sm"
                          />
                        </div>
                        <Select value={currency.code} onValueChange={handleCurrencyChange}>
                          <SelectTrigger className="h-9 md:h-10 text-sm">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
<<<<<<< HEAD
                          <SelectContent
=======
                          <SelectContent 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
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
<<<<<<< HEAD
                      <ToggleGroup
                        type="single"
                        value={theme}
                        onValueChange={handleThemeChange}
                        className="justify-start bg-muted/50 p-1 rounded-lg inline-flex"
                      >
                        <ToggleGroupItem
                          value="light"
                          aria-label="Light mode"
                          className="flex items-center gap-2 rounded-md data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all duration-200 px-3 py-2"
                        >
                          <Sun className="h-4 w-4" strokeWidth={1.5} />
                          Light Mode
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="dark"
                          aria-label="Dark mode"
                          className="flex items-center gap-2 rounded-md data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all duration-200 px-3 py-2"
                        >
                          <Moon className="h-4 w-4" strokeWidth={1.5} />
=======
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
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
                          Dark Mode
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="notifications" className="border-b">
<<<<<<< HEAD
                <AccordionTrigger className="px-4 md:px-6 py-5 hover:no-underline hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bell className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-base md:text-lg">Notification Preferences</div>
                      <div className="text-sm text-muted-foreground mt-0.5">Manage your notification settings</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6 pt-2">
=======
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
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
                  <NotificationPreferences />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="categories" className="border-b">
<<<<<<< HEAD
                <AccordionTrigger className="px-4 md:px-6 py-5 hover:no-underline hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shapes className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-base md:text-lg">Manage Categories</div>
                      <div className="text-sm text-muted-foreground mt-0.5">Create and organize transaction categories</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6 pt-2">
=======
                <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Shapes className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Manage Categories</div>
                      <div className="text-sm text-muted-foreground">Create and organize transaction categories</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6">
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
                  <CategoryManagement />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="archive" className="border-b">
<<<<<<< HEAD
                <AccordionTrigger className="px-4 md:px-6 py-5 hover:no-underline hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Archive className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-base md:text-lg">Archived Transactions</div>
                      <div className="text-sm text-muted-foreground mt-0.5">View and manage archived data</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6 pt-2">
=======
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
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
                  <ArchiveManagement />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="offline" className="border-b">
<<<<<<< HEAD
                <AccordionTrigger className="px-4 md:px-6 py-5 hover:no-underline hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <HardDrive className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-base md:text-lg">Offline and Cache</div>
                      <div className="text-sm text-muted-foreground mt-0.5">Manage offline data storage and sync settings</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6 pt-2">
=======
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
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
                  <DebugSection />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delete-account" className="border-0">
<<<<<<< HEAD
                <AccordionTrigger className="px-4 md:px-6 py-5 hover:no-underline hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <Trash2 className="h-5 w-5 text-destructive" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-base md:text-lg text-destructive">Delete Your Account or Data</div>
                      <div className="text-sm text-muted-foreground mt-0.5">Permanently remove your account or data</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-6 pt-2">
=======
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
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
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
