
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { currencies, getCurrencyByCode, Currency } from '@/lib/currencies';

interface SettingsContextType {
  currency: Currency;
  loading: boolean;
  error: string | null;
}

const defaultCurrency = getCurrencyByCode('USD');

const SettingsContext = createContext<SettingsContextType>({
  currency: defaultCurrency,
  loading: true,
  error: null,
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        
        if (userSettings) {
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
          if (updatedSettings) {
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
  };
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
