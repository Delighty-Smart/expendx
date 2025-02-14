
import { createContext, useContext, useEffect, useState } from "react";
import { Currency, currencies } from "@/lib/currencies";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface SettingsContextType {
  currency: Currency;
  isLoading: boolean;
  updateCurrency: (code: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(currencies[0]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: settings } = useQuery({
    queryKey: ["user_settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no settings exist, create default settings
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from("user_settings")
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (insertError) throw insertError;
        return newSettings;
      }

      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const currentCurrency = currencies.find(c => c.code === settings.currency_code) || currencies[0];
      setCurrency(currentCurrency);
      setIsLoading(false);
    }
  }, [settings]);

  const updateCurrency = async (code: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_settings")
      .update({ currency_code: code })
      .eq("user_id", user.id);

    if (error) throw error;

    const newCurrency = currencies.find(c => c.code === code) || currencies[0];
    setCurrency(newCurrency);
  };

  return (
    <SettingsContext.Provider value={{ currency, isLoading, updateCurrency }}>
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
