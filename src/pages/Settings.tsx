
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
import { Search } from "lucide-react";

const Settings = () => {
  const { currency, updateCurrency } = useSettings();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

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
                <SelectContent className="bg-background/95 backdrop-blur-sm border">
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
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
