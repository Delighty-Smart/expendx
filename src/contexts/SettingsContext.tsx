import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { currencies } from '@/lib/currencies';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/hooks/useAuth';

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
  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('expendx_currency');
    if (saved) {
      const currencyObj = currencies.find(c => c.code === saved) || {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar'
      };
      return currencyObj;
    }
    return {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar'
    };
  });

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

  const isInitialized = useRef<boolean>(false);
  const { user } = useAuth();

  // Initialize settings on mount and listen for auth changes
  useEffect(() => {
    let authListener: any;

    const initializeSettings = async () => {
      try {
        console.log('Initializing settings...');

        // Initial theme application from localStorage (for fast UI response)
        const savedTheme = localStorage.getItem('expendx_theme') as 'light' | 'dark' | null;
        if (savedTheme) {
          document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        }

        // Setup auth listener to fetch settings whenever user logs in
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth event in SettingsContext:', event);
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
            await fetchUserSettings();
          } else if (event === 'SIGNED_OUT') {
            // Reset to defaults on sign out if desired, or keep local
            console.log('User signed out, keeping local settings for now');
          }
        });

        authListener = subscription;

        // One-time initial fetch
        if (user) {
          await fetchUserSettings();
        }
      } catch (error) {
        console.error('Error initializing settings:', error);
      }
    };

    const askNotification = async () => {
      if (!notificationService.isSupported()) return;
      if (Notification.permission === 'default' && !localStorage.getItem('expendx_noti_permission_prompted')) {
        try {
          const permission = await Notification.requestPermission();
          localStorage.setItem('expendx_noti_permission_prompted', 'true');
        } catch (e) {
          console.warn("Unable to request browser notification permission", e);
        }
      }
    };

    askNotification();
    initializeSettings();

    return () => {
      if (authListener) authListener.unsubscribe();
    };
    // eslint-disable-next-line
  }, []);

  // Auto-save settings changes
  useEffect(() => {
    // Prevent saving defaults on mount before server fetch
    if (!isInitialized.current) return;

    const saveTimeout = setTimeout(() => {
      updateUserSettings();
    }, 1000);

    // Update HTML class for theme immediately
    document.documentElement.classList.toggle('dark', theme === 'dark');

    return () => clearTimeout(saveTimeout);
  }, [currency, theme, hideAmounts, user?.id]);

  // Get user settings from Supabase
  const fetchUserSettings = async () => {
    try {
      console.log('fetchUserSettings called');

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Settings fetch timed out')), 8000);
      });

      const userPromise = supabase.auth.getUser();
      const { data: { user }, error: userError } = await (Promise.race([userPromise, timeoutPromise]) as any);

      if (userError || !user) {
        console.log('No user or error in fetchUserSettings, using local: ', userError);
        return;
      }

      console.log('Fetching server settings for user:', user.id);

      // 1. Fetch Currency from user_settings table
      const settingsPromise = supabase
        .from('user_settings')
        .select('currency_code')
        .eq('user_id', user.id)
        .single();

      const { data: settingsData, error: settingsError } = await (Promise.race([settingsPromise, timeoutPromise]) as any);

      if (settingsError && !settingsError.message.includes('No rows found')) {
        console.error('Error fetching user_settings:', settingsError);
      } else if (settingsData?.currency_code) {
        // SERVER WINS: Update state and localStorage with server value
        console.log('Applying server currency:', settingsData.currency_code);
        const currencyObj = currencies.find(c => c.code === settingsData.currency_code);
        if (currencyObj) {
          setCurrency(currencyObj);
          localStorage.setItem('expendx_currency', currencyObj.code);
        }
      } else {
        // No server settings found, push local if it exists
        const localCurrency = localStorage.getItem('expendx_currency');
        if (localCurrency) {
          console.log('Pushing local currency to server:', localCurrency);
          await supabase.from('user_settings').upsert({
            user_id: user.id,
            currency_code: localCurrency
          });
        }
      }

      // 2. Fetch Theme and HideAmounts from User Metadata
      const metadata = user.user_metadata;
      if (metadata) {
        if (metadata.theme && (metadata.theme === 'light' || metadata.theme === 'dark')) {
          console.log('Applying server theme:', metadata.theme);
          setTheme(metadata.theme);
          document.documentElement.classList.toggle('dark', metadata.theme === 'dark');
          localStorage.setItem('expendx_theme', metadata.theme);
        }

        if (typeof metadata.hideAmounts === 'boolean') {
          console.log('Applying server hideAmounts:', metadata.hideAmounts);
          setHideAmounts(metadata.hideAmounts);
          localStorage.setItem('expendx_hideAmounts', metadata.hideAmounts.toString());
        }
      }
    }
      }

  // Mark as initialized so FUTURE changes trigger sync to server
  isInitialized.current = true;
  console.log('Settings successfully initialized from server');
} catch (error) {
  console.error('Error in fetchUserSettings:', error);
  // Fallback: still mark as initialized so user can save changes even if fetch failed
  isInitialized.current = true;
}
  };

// Update user settings with better persistence
const updateUserSettings = async () => {
  try {
    // 1. Local Persistence (Fast UI)
    localStorage.setItem('expendx_theme', theme);
    localStorage.setItem('expendx_hideAmounts', hideAmounts.toString());
    localStorage.setItem('expendx_currency', currency.code);

    // 2. Server Sync
    if (!navigator.onLine) return;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Settings update timed out')), 5000);
    });

    const userPromise = supabase.auth.getUser();
    const { data: { user } } = await (Promise.race([userPromise, timeoutPromise]) as any);

    if (!user) return;

    console.log('Syncing settings to server for user:', user.id);

    // Sync Currency (Table)
    const currencyPromise = supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        currency_code: currency.code,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    await Promise.race([currencyPromise, timeoutPromise]);

    // Sync Theme & Visibility (Auth Metadata)
    const metaPromise = supabase.auth.updateUser({
      data: {
        theme: theme,
        hideAmounts: hideAmounts
      }
    });

    await Promise.race([metaPromise, timeoutPromise]);

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
  localStorage.setItem('expendx_currency', currencyObj.code);
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
