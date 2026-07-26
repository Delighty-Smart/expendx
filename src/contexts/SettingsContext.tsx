import React, { createContext, useState, useEffect, useContext, ReactNode, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { currencies } from '@/lib/currencies';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export const syncStatusBarTheme = (themeMode?: 'light' | 'dark') => {
    if (Capacitor.isNativePlatform()) {
        const currentTheme = themeMode || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        const isDark = currentTheme === 'dark';
        // Swapped status bar colors:
        // Dark Mode: Style.Dark (dark status bar content) with #FFFFFF background
        // Light Mode: Style.Light (light status bar content) with #050507 background
        StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => { });
        StatusBar.setBackgroundColor({ color: isDark ? '#FFFFFF' : '#050507' }).catch(() => { });
    }
};

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
    showLifeHours: boolean;
    toggleShowLifeHours: () => void;
    trueHourlyRate: number;
    updateTrueHourlyRate: (rate: number) => void;
    formatValue: (amount: number) => string;
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

    const [showLifeHours, setShowLifeHours] = useState<boolean>(() => {
        return localStorage.getItem('expendx_show_life_hours') === 'true';
    });

    const [trueHourlyRate, setTrueHourlyRate] = useState<number>(() => {
        const saved = localStorage.getItem('lucent_true_hourly_rate') || localStorage.getItem('expendx_true_hourly_rate');
        const rate = parseFloat(saved || '');
        return isNaN(rate) || rate <= 0 ? 15.63 : rate;
    });

    const updateTrueHourlyRate = (newRate: number) => {
        const validRate = isNaN(newRate) || newRate <= 0 ? 15.63 : newRate;
        setTrueHourlyRate(validRate);
        localStorage.setItem('lucent_true_hourly_rate', validRate.toString());
        localStorage.setItem('expendx_true_hourly_rate', validRate.toString());
        window.dispatchEvent(new Event('storage'));
    };

    useEffect(() => {
        const handleRateSync = () => {
            const saved = localStorage.getItem('lucent_true_hourly_rate') || localStorage.getItem('expendx_true_hourly_rate');
            const rate = parseFloat(saved || '');
            setTrueHourlyRate(isNaN(rate) || rate <= 0 ? 15.63 : rate);
        };
        window.addEventListener('storage', handleRateSync);
        return () => window.removeEventListener('storage', handleRateSync);
    }, []);

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
        // Update HTML class for theme immediately
        document.documentElement.classList.toggle('dark', theme === 'dark');

        // Sync Android status bar style and background color with app theme
        syncStatusBarTheme(theme);

        // Update theme-color meta tag for PWA/Mobile
        const themeColor = theme === 'dark' ? '#050507' : '#ffffff';

        // Update all theme-color meta tags (including those with media queries)
        const metaTags = document.querySelectorAll('meta[name="theme-color"]');
        metaTags.forEach(tag => {
            tag.setAttribute('content', themeColor);
        });

        // Prevent saving defaults on mount before server fetch
        if (!isInitialized.current) return;

        const saveTimeout = setTimeout(() => {
            updateUserSettings();
        }, 1000);

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

            // 2. Fetch Theme, HideAmounts, and Life Energy data from User Metadata
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

                if (metadata.life_energy_data) {
                    const dataStr = typeof metadata.life_energy_data === 'string' 
                        ? metadata.life_energy_data 
                        : JSON.stringify(metadata.life_energy_data);
                    localStorage.setItem('lucent_life_energy_data', dataStr);
                    localStorage.setItem('expendx_life_energy_data', dataStr);
                    try {
                        const parsed = typeof metadata.life_energy_data === 'string' ? JSON.parse(metadata.life_energy_data) : metadata.life_energy_data;
                        if (parsed.trueHourlyRate) {
                            setTrueHourlyRate(parsed.trueHourlyRate);
                            localStorage.setItem('lucent_true_hourly_rate', parsed.trueHourlyRate.toString());
                            localStorage.setItem('expendx_true_hourly_rate', parsed.trueHourlyRate.toString());
                        }
                    } catch (e) {}
                    window.dispatchEvent(new Event('storage'));
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

            // Sync Theme, Visibility & Life Energy (Auth Metadata)
            const savedLifeEnergy = localStorage.getItem('lucent_life_energy_data') || localStorage.getItem('expendx_life_energy_data');
            const metaPromise = supabase.auth.updateUser({
                data: {
                    theme: theme,
                    hideAmounts: hideAmounts,
                    ...(savedLifeEnergy ? { life_energy_data: savedLifeEnergy } : {})
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

    const toggleShowLifeHours = () => {
        setShowLifeHours(prev => {
            const next = !prev;
            localStorage.setItem('expendx_show_life_hours', next.toString());
            return next;
        });
    };

    const formatValue = (amount: number) => {
        if (hideAmounts) return '***';
        if (showLifeHours) {
            const hrs = amount / trueHourlyRate;
            return hrs.toLocaleString('en-US', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }) + ' hrs';
        }
        return currency.symbol + amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const contextValue: SettingsContextType = {
        currency,
        setCurrency,
        theme,
        updateTheme,
        updateCurrency,
        hideAmounts,
        toggleHideAmounts,
        showLifeHours,
        toggleShowLifeHours,
        trueHourlyRate,
        updateTrueHourlyRate,
        formatValue
    };

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
        </SettingsContext.Provider>
    );
};

export default SettingsProvider;
