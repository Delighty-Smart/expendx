import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SettingsContextType {
  currency: string;
  setCurrency: (currency: string) => void;
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
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    fetchUserSettings();
  }, []);

  useEffect(() => {
    updateUserSettings(currency);
  }, [currency]);

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
        setCurrency(data.currency_code);
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

  return (
    <SettingsContext.Provider value={{ currency, setCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
};
