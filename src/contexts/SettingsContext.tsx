
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { currencies, getCurrencyByCode, Currency } from '@/lib/currencies';

interface SettingsContextType {
  currency: Currency;
  loading: boolean;
  error: string | null;
  theme: "light" | "dark";
  updateCurrency: (code: string) => Promise<void>;
  updateTheme: (theme: "light" | "dark") => void;
}

const defaultCurrency = getCurrencyByCode('USD');

const SettingsContext = createContext<SettingsContextType>({
  currency: defaultCurrency,
  loading: true,
  error: null,
  theme: "light",
  updateCurrency: async () => {},
  updateTheme: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load saved theme from localStorage on initial render
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      // Check user preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  // Update currency function
  const updateCurrency = async (code: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const { error: updateError } = await supabase
        .from('user_settings')
        .upsert({ 
          user_id: user.id,
          currency_code: code 
        }, { 
          onConflict: 'user_id' 
        });
      
      if (updateError) {
        throw updateError;
      }
      
      const currencyObj = getCurrencyByCode(code);
      setCurrency(currencyObj);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };
  
  // Update theme function
  const updateTheme = (newTheme: "light" | "dark"): void => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        const { data: userSettings, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (settingsError) {
          throw settingsError;
        }
        
        if (userSettings && userSettings.currency_code) {
          const currencyCode = userSettings.currency_code;
          const currencyObj = getCurrencyByCode(currencyCode);
          setCurrency(currencyObj);
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching user settings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserSettings();
    
    // Listen for real-time changes to user settings
    const channel = supabase
      .channel('user_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings'
        },
        (payload) => {
          const updatedSettings = payload.new;
          if (updatedSettings && updatedSettings.currency_code) {
            const currencyCode = updatedSettings.currency_code;
            const currencyObj = getCurrencyByCode(currencyCode);
            setCurrency(currencyObj);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const value = {
    currency,
    loading,
    error,
    theme,
    updateCurrency,
    updateTheme
  };
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
