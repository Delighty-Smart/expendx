import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Currency, currencies } from '@/lib/currencies';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface Settings {
  currency: Currency;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  loading: boolean;
  currency: Currency;
}

const defaultSettings: Settings = {
  currency: currencies.USD,
  theme: 'system',
  notifications: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Load settings from database on initial render
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
          if (error && error.code !== 'PGRST116') {
            console.error('Error loading settings:', error);
          }
          
          if (data) {
            const loadedSettings: Settings = {
              currency: currencies[data.currency_code] || currencies.USD,
              theme: data.theme || 'system',
              notifications: data.notifications !== undefined ? data.notifications : true,
            };
            setSettings(loadedSettings);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadSettings();
  }, []);

  // Subscribe to settings changes
  useRealtimeSubscription(
    'user_settings',
    'UPDATE',
    async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          const updatedSettings: Settings = {
            currency: currencies[data.currency_code] || currencies.USD,
            theme: data.theme || 'system',
            notifications: data.notifications !== undefined ? data.notifications : true,
          };
          setSettings(updatedSettings);
        }
      } catch (error) {
        console.error('Error refreshing settings:', error);
      }
    }
  );

  // Update settings in database
  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          currency_code: updatedSettings.currency.code,
          theme: updatedSettings.theme,
          notifications: updatedSettings.notifications,
          updated_at: new Date().toISOString(),
        });
        
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Revert settings on error
      setSettings(settings);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      updateSettings, 
      loading,
      currency: settings.currency
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
