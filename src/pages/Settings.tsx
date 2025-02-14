
import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currencies } from "@/lib/currencies";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/components/ui/use-toast";
import { Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const Settings = () => {
  const { currency, updateCurrency } = useSettings();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  const filteredCurrencies = currencies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCurrencyChange = async (code: string) => {
    try {
      await updateCurrency(code);
      toast({
        title: "Settings updated",
        description: "Your currency preference has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    document.documentElement.classList.toggle("light", newTheme === "light");
    toast({
      title: "Theme updated",
      description: `Theme switched to ${newTheme} mode.`,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral">Settings</h1>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Currency</Label>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search currencies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={currency.code} onValueChange={handleCurrencyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCurrencies.map((c) => (
                    <SelectItem
                      key={c.code}
                      value={c.code}
                      className="hover:bg-accent"
                    >
                      {c.name} ({c.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                className="flex items-center gap-2"
                onClick={() => handleThemeChange("light")}
              >
                <Sun className="h-4 w-4" />
                Light Mode
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                className="flex items-center gap-2"
                onClick={() => handleThemeChange("dark")}
              >
                <Moon className="h-4 w-4" />
                Dark Mode
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
