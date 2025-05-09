
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { currencies } from '@/lib/currencies';

// Define type for the currency object
interface Currency {
  code: string;
  symbol: string;
  name: string; // Ensure name property is included
}

interface SettingsContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  theme: string;
  updateTheme: (theme: 'light' | 'dark') => void;
  updateCurrency: (currencyCode: string) => void;
  hideAmounts: boolean; // Add the missing hideAmounts property
  toggleHideAmounts: () => void; // Add method to toggle hideAmounts
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$', name: 'US Dollar' });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hideAmounts, setHideAmounts] = useState<boolean>(false);

  useEffect(() => {
    fetchUserSettings();
    // Set initial theme based on system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  useEffect(() => {
    updateUserSettings(currency.code);
    // Update HTML class for theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [currency, theme]);

  // Get user settings from Supabase
  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && !error.message.includes('No rows found')) {
        console.error('Error fetching user settings:', error);
        return;
      }

      // If settings exists, update the state with the saved currency
      if (data && data.currency_code) {
        const currencyObj = currencies.find(c => c.code === data.currency_code) || { code: 'USD', symbol: '$', name: 'US Dollar' };
        setCurrency(currencyObj);
      }
    } catch (error) {
      console.error('Error in fetchUserSettings:', error);
    }
  };

  // Update user settings in Supabase
  const updateUserSettings = async (currencyCode: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if settings already exist for the user
      const { data: existingSettings, error: selectError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (selectError && !selectError.message.includes('No rows found')) {
        console.error('Error checking existing settings:', selectError);
        return;
      }

      if (existingSettings) {
        // Update existing settings
        const { error: updateError } = await supabase
          .from('user_settings')
          .update({ currency_code: currencyCode })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating user settings:', updateError);
        }
      } else {
        // Create new settings
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, currency_code: currencyCode });

        if (insertError) {
          console.error('Error creating user settings:', insertError);
        }
      }
    } catch (error) {
      console.error('Error in updateUserSettings:', error);
    }
  };

  // Function to update theme
  const updateTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  // Function to update currency by code
  const updateCurrency = (currencyCode: string) => {
    const currencyObj = currencies.find(c => c.code === currencyCode) || { code: 'USD', symbol: '$', name: 'US Dollar' };
    setCurrency(currencyObj);
  };

  // Function to toggle hideAmounts
  const toggleHideAmounts = () => {
    setHideAmounts(prev => !prev);
  };

  return (
    <SettingsContext.Provider value={{ 
      currency, 
      setCurrency, 
      theme, 
      updateTheme,
      updateCurrency,
      hideAmounts,
      toggleHideAmounts
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
