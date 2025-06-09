
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
    initializeSettings();
  }, []);

  useEffect(() => {
    // Update user settings when currency or theme changes
    updateUserSettings();
    // Update HTML class for theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [currency, theme, hideAmounts]);

  const initializeSettings = async () => {
    try {
      // First, try to get settings from localStorage for immediate UI response
      const savedTheme = localStorage.getItem('expendx_theme') as 'light' | 'dark' | null;
      const savedHideAmounts = localStorage.getItem('expendx_hideAmounts') === 'true';
      const savedCurrency = localStorage.getItem('expendx_currency');

      // Apply saved theme immediately
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } else {
        // Set initial theme based on system preference if no saved theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = prefersDark ? 'dark' : 'light';
        setTheme(initialTheme);
        document.documentElement.classList.toggle('dark', initialTheme === 'dark');
        localStorage.setItem('expendx_theme', initialTheme);
      }

      // Apply saved hide amounts setting
      setHideAmounts(savedHideAmounts);

      // Apply saved currency
      if (savedCurrency) {
        const currencyObj = currencies.find(c => c.code === savedCurrency) || { code: 'USD', symbol: '$', name: 'US Dollar' };
        setCurrency(currencyObj);
      }

      // Then fetch from Supabase to sync with server
      await fetchUserSettings();
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
  };

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
        localStorage.setItem('expendx_currency', data.currency_code);
      }
    } catch (error) {
      console.error('Error in fetchUserSettings:', error);
    }
  };

  // Update user settings in Supabase and localStorage
  const updateUserSettings = async () => {
    try {
      // Always save to localStorage for immediate persistence
      localStorage.setItem('expendx_theme', theme);
      localStorage.setItem('expendx_hideAmounts', hideAmounts.toString());
      localStorage.setItem('expendx_currency', currency.code);

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
          .update({ currency_code: currency.code })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating user settings:', updateError);
        }
      } else {
        // Create new settings
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, currency_code: currency.code });

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
