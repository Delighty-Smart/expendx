
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { currencies } from '@/lib/currencies';

// Define type for the currency object
interface Currency {
  code: string;
  symbol: string;
  name: string;
}

interface SettingsContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  theme: string;
  updateTheme: (theme: 'light' | 'dark') => void;
  updateCurrency: (currencyCode: string) => void;
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // Initialize state with proper default values
  const [currency, setCurrency] = useState<Currency>(() => ({ 
    code: 'USD', 
    symbol: '$', 
    name: 'US Dollar' 
  }));
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('expendx_theme') as 'light' | 'dark' | null;
    if (savedTheme) return savedTheme;
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });
  
  const [hideAmounts, setHideAmounts] = useState<boolean>(() => {
    return localStorage.getItem('expendx_hideAmounts') === 'true';
  });

  // Initialize settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Apply theme immediately
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('expendx_theme', theme);

        // Load saved currency
        const savedCurrency = localStorage.getItem('expendx_currency');
        if (savedCurrency) {
          const currencyObj = currencies.find(c => c.code === savedCurrency) || { 
            code: 'USD', 
            symbol: '$', 
            name: 'US Dollar' 
          };
          setCurrency(currencyObj);
        }

        // Sync with server
        await fetchUserSettings();
      } catch (error) {
        console.error('Error initializing settings:', error);
      }
    };

    initializeSettings();
  }, []);

  // Auto-save settings changes
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      updateUserSettings();
    }, 500);

    // Update HTML class for theme immediately
    document.documentElement.classList.toggle('dark', theme === 'dark');

    return () => clearTimeout(saveTimeout);
  }, [currency, theme, hideAmounts]);

  // Get user settings from Supabase
  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && !error.message.includes('No rows found')) {
        console.error('Error fetching user settings:', error);
        return;
      }

      if (data && data.currency_code) {
        const currencyObj = currencies.find(c => c.code === data.currency_code) || { 
          code: 'USD', 
          symbol: '$', 
          name: 'US Dollar' 
        };
        setCurrency(currencyObj);
        localStorage.setItem('expendx_currency', data.currency_code);
      }
    } catch (error) {
      console.error('Error in fetchUserSettings:', error);
    }
  };

  // Update user settings with better persistence
  const updateUserSettings = async () => {
    try {
      // Always save to localStorage immediately
      localStorage.setItem('expendx_theme', theme);
      localStorage.setItem('expendx_hideAmounts', hideAmounts.toString());
      localStorage.setItem('expendx_currency', currency.code);

      // Save additional settings metadata
      const additionalSettings = {
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem('expendx_settings_meta', JSON.stringify(additionalSettings));

      // Sync with server
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        const { error: updateError } = await supabase
          .from('user_settings')
          .update({ currency_code: currency.code })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating user settings:', updateError);
        }
      } else {
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
    const currencyObj = currencies.find(c => c.code === currencyCode) || { 
      code: 'USD', 
      symbol: '$', 
      name: 'US Dollar' 
    };
    setCurrency(currencyObj);
  };

  // Function to toggle hideAmounts
  const toggleHideAmounts = () => {
    setHideAmounts(prev => !prev);
  };

  const contextValue: SettingsContextType = {
    currency,
    setCurrency,
    theme,
    updateTheme,
    updateCurrency,
    hideAmounts,
    toggleHideAmounts
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;
