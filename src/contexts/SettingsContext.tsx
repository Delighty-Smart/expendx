
import { createContext, useContext, useEffect, useState } from "react";
import { Currency, currencies } from "@/lib/currencies";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "@/hooks/use-toast";

interface SettingsContextType {
  currency: Currency;
  isLoading: boolean;
  theme: "light" | "dark";
  updateCurrency: (code: string) => Promise<void>;
  updateTheme: (newTheme: "light" | "dark") => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(currencies[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // First check localStorage
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
    
    // Default to light theme
    return "light";
  });

  // Fetch the current user ID on mount
  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    }
    fetchUser();
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Only fetch settings if we have a user ID
  const { data: settings } = useQuery({
    queryKey: ["user_settings", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      
      // If no settings exist, create default settings
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from("user_settings")
          .insert([{ user_id: userId }])
          .select()
          .single();

        if (insertError) throw insertError;
        return newSettings;
      }

      return data;
    },
    // Only run this query when we have a userId
    enabled: !!userId
  });

  // Subscribe to user settings changes
  useRealtimeSubscription("user_settings", "*", (payload) => {
    if (!userId || payload.new.user_id !== userId) return;
    
    // Update currency when settings change
    if (payload.new.currency_code) {
      const newCurrency = currencies.find(c => c.code === payload.new.currency_code) || currencies[0];
      setCurrency(newCurrency);
    }
  });

  useEffect(() => {
    if (settings) {
      const currentCurrency = currencies.find(c => c.code === settings.currency_code) || currencies[0];
      setCurrency(currentCurrency);
      setIsLoading(false);
    }
  }, [settings]);

  const updateCurrency = async (code: string) => {
    try {
      if (!userId) return;

      const { error } = await supabase
        .from("user_settings")
        .update({ currency_code: code })
        .eq("user_id", userId);

      if (error) throw error;

      const newCurrency = currencies.find(c => c.code === code) || currencies[0];
      setCurrency(newCurrency);
      
      toast({
        title: "Currency updated",
        description: `Your currency has been updated to ${newCurrency.name} (${newCurrency.symbol})`
      });
    } catch (error: any) {
      toast({
        title: "Error updating currency",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const updateTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
  };

  return (
    <SettingsContext.Provider value={{ 
      currency, 
      isLoading, 
      theme,
      updateCurrency,
      updateTheme
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
