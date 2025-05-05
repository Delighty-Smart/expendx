
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { currencies } from "@/lib/currencies";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/components/ui/use-toast";
import { Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryManagement } from "@/components/CategoryManagement";
import { ScrollArea } from "@/components/ui/scroll-area";

const Settings = () => {
  const {
    currency,
    updateCurrency,
    theme,
    updateTheme
  } = useSettings();
  
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  
  const filteredCurrencies = currencies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );
  
  const handleCurrencyChange = async (code: string) => {
    try {
      await updateCurrency(code);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const handleThemeChange = (newTheme: "light" | "dark") => {
    updateTheme(newTheme);
    toast({
      title: "Theme updated",
      description: `Theme switched to ${newTheme} mode.`
    });
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-xl md:text-2xl font-bold">Settings</h1>

        <Card className="p-4 md:p-6 space-y-6 glass-card">
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
                <SelectContent className="bg-popover text-popover-foreground backdrop-blur-lg scrollable-container">
                  <ScrollArea className="max-h-[40vh] sm:max-h-[50vh]" style={{
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                  }}>
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

          <div className="space-y-2">
            <Label className="text-sm md:text-base">Theme</Label>
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
              <Button 
                variant={theme === "light" ? "default" : "outline"} 
                size={isMobile ? "sm" : "default"}
                className="flex items-center gap-2 w-full md:w-auto justify-center"
                onClick={() => handleThemeChange("light")}
              >
                <Sun className="h-4 w-4" />
                Light Mode
              </Button>
              <Button 
                variant={theme === "dark" ? "default" : "outline"} 
                size={isMobile ? "sm" : "default"}
                className="flex items-center gap-2 w-full md:w-auto justify-center"
                onClick={() => handleThemeChange("dark")}
              >
                <Moon className="h-4 w-4" />
                Dark Mode
              </Button>
            </div>
          </div>
        </Card>
        
        <CategoryManagement />
      </div>
    </Layout>
  );
};

export default Settings;
