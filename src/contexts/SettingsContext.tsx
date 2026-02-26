import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { currencies } from '@/lib/currencies';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

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
                code: 'NGN',
                symbol: '₦',
                name: 'Nigerian Naira'
            };
            return currencyObj;
        }
        return {
            code: 'NGN',
            symbol: '₦',
            name: 'Nigerian Naira'
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

    // Initialize settings on mount and fetch when user changes
    useEffect(() => {
        // Initial theme application from localStorage (for fast UI response)
        const savedTheme = localStorage.getItem('expendx_theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        }
    }, []);

    // Fetch user settings when user logs in or changes
    useEffect(() => {
        if (user) {
            fetchUserSettings();
        }
    }, [user?.id]);

    // Ask for notification permission once
    useEffect(() => {
        const askNotification = async () => {
            if (!notificationService.isSupported()) return;
            if (Notification.permission === 'default' && !localStorage.getItem('expendx_noti_permission_prompted')) {
                try {
                    await Notification.requestPermission();
                    localStorage.setItem('expendx_noti_permission_prompted', 'true');
                } catch (e) {
                    console.warn("Unable to request browser notification permission", e);
                }
            }
        };
        askNotification();
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

        // Sync Android status bar style with app theme
        if (Capacitor.isNativePlatform()) {
            StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => { });
        }

        // Update theme-color meta tag for PWA/Mobile
        const themeColor = theme === 'dark' ? '#0f0f10' : '#ffffff';

        // Update all theme-color meta tags (including those with media queries)
        const metaTags = document.querySelectorAll('meta[name="theme-color"]');
        metaTags.forEach(tag => {
            tag.setAttribute('content', themeColor);
        });

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
                const currencyObj = currencies.find(c => c.code === settingsData.currency_code);
                if (currencyObj) {
                    setCurrency(currencyObj);
                    localStorage.setItem('expendx_currency', currencyObj.code);
                }
            } else {
                const localCurrency = localStorage.getItem('expendx_currency');
                if (localCurrency) {
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
                    setTheme(metadata.theme);
                    document.documentElement.classList.toggle('dark', metadata.theme === 'dark');
                    localStorage.setItem('expendx_theme', metadata.theme);
                }

                if (typeof metadata.hideAmounts === 'boolean') {
                    setHideAmounts(metadata.hideAmounts);
                    localStorage.setItem('expendx_hideAmounts', metadata.hideAmounts.toString());
                }
            }

            // Mark as initialized so FUTURE changes trigger sync to server
            isInitialized.current = true;
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
            // Only sync if online AND initialized (to prevent overwriting server with local defaults)
            if (!navigator.onLine || !isInitialized.current) return;

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Settings update timed out')), 5000);
            });

            const userPromise = supabase.auth.getUser();
            const { data: { user } } = await (Promise.race([userPromise, timeoutPromise]) as any);

            if (!user) return;

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
            code: 'NGN',
            symbol: '₦',
            name: 'Nigerian Naira'
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
