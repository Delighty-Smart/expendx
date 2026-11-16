import React, { createContext, useState, useEffect, useContext, ReactNode, useRef, useMemo } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { currencies } from '@/lib/currencies';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Sync the native Android / iOS status-bar icon colour + background
 * to match the current app theme.
 *
 * Capacitor StatusBar.Style values:
 *   Style.Dark  = dark *icons* (black text/icons) → use on LIGHT backgrounds
 *   Style.Light = light *icons* (white text/icons) → use on DARK backgrounds
 *
 * Call this:
 *   • whenever the theme is toggled
 *   • on every route navigation (App.tsx)
 *   • once at cold-start (App.tsx mount)
 */
export async function syncStatusBarTheme(themeOverride?: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const savedTheme = localStorage.getItem('expendx_theme');
    // Determine the active theme: explicit arg → DOM class → localStorage → system preference
    const isDark =
      themeOverride === 'dark' ||
      (themeOverride !== 'light' && (
        document.documentElement.classList.contains('dark') ||
        savedTheme === 'dark' ||
        (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ));

    const targetColor = isDark ? '#131211' : '#FBF9F4';

    // Style.Light = white text/icons
    // Style.Dark  = black/dark text/icons
    // Inverted per user request: dark icons on dark mode, light icons on light mode
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
    await StatusBar.setBackgroundColor({ color: targetColor }).catch(() => {});

    // Sync HTML theme-color meta tags
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    metaTags.forEach(tag => {
      tag.setAttribute('content', targetColor);
    });
  } catch (e) {
    console.warn('StatusBar sync failed', e);
  }
}


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

    const { user } = useAuth();

    // Per-user keys: income and life-energy data must never cross accounts
    const uid = user?.id ?? 'anon';
    const HOURLY_RATE_KEY = `lucent_true_hourly_rate_${uid}`;
    const LIFE_ENERGY_KEY = `lucent_life_energy_data_${uid}`;

    const [trueHourlyRate, setTrueHourlyRate] = useState<number>(() => {
        const saved = localStorage.getItem(HOURLY_RATE_KEY);
        const rate = parseFloat(saved || '');
        return isNaN(rate) || rate <= 0 ? 15.63 : rate;
    });

    const updateTrueHourlyRate = (newRate: number) => {
        const validRate = isNaN(newRate) || newRate <= 0 ? 15.63 : newRate;
        setTrueHourlyRate(validRate);
        localStorage.setItem(HOURLY_RATE_KEY, validRate.toString());
        window.dispatchEvent(new Event('storage'));
    };

    useEffect(() => {
        const handleRateSync = () => {
            const saved = localStorage.getItem(HOURLY_RATE_KEY);
            const rate = parseFloat(saved || '');
            setTrueHourlyRate(isNaN(rate) || rate <= 0 ? 15.63 : rate);
        };
        window.addEventListener('storage', handleRateSync);
        return () => window.removeEventListener('storage', handleRateSync);
    }, [uid]);

    const isInitialized = useRef<boolean>(false);

    // Initialize settings on mount and fetch when user changes
    useEffect(() => {
        // Initial theme application from localStorage or system preference (for fast UI response)
        const savedTheme = localStorage.getItem('expendx_theme') as 'light' | 'dark' | null;
        const isDark = savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', isDark);
        syncStatusBarTheme(isDark ? 'dark' : 'light');
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
        const themeColor = theme === 'dark' ? '#131211' : '#FBF9F4';

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

    // Get user settings from Firestore
    const fetchUserSettings = async () => {
        try {
            console.log('fetchUserSettings called');
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            // 1. Fetch Currency from user_settings table
            const settingsRef = doc(db, 'user_settings', currentUser.uid);
            const settingsSnap = await getDoc(settingsRef);

            if (settingsSnap.exists() && settingsSnap.data()?.currency_code) {
                const currencyObj = currencies.find(c => c.code === settingsSnap.data().currency_code);
                if (currencyObj) {
                    setCurrency(currencyObj);
                    localStorage.setItem('expendx_currency', currencyObj.code);
                }
            } else {
                const localCurrency = localStorage.getItem('expendx_currency');
                if (localCurrency) {
                    await setDoc(settingsRef, {
                        user_id: currentUser.uid,
                        currency_code: localCurrency,
                        updated_at: new Date().toISOString()
                    }, { merge: true });
                }
            }

            // 2. Fetch Theme, HideAmounts, and Life Energy data from user_profiles collection
            const profileRef = doc(db, 'user_profiles', currentUser.uid);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                const profileData = profileSnap.data();
                if (profileData.theme && (profileData.theme === 'light' || profileData.theme === 'dark')) {
                    setTheme(profileData.theme);
                    document.documentElement.classList.toggle('dark', profileData.theme === 'dark');
                    localStorage.setItem('expendx_theme', profileData.theme);
                }

                if (typeof profileData.hideAmounts === 'boolean') {
                    setHideAmounts(profileData.hideAmounts);
                    localStorage.setItem('expendx_hideAmounts', profileData.hideAmounts.toString());
                }

                if (profileData.life_energy_data) {
                    const dataStr = typeof profileData.life_energy_data === 'string' 
                        ? profileData.life_energy_data 
                        : JSON.stringify(profileData.life_energy_data);
                    localStorage.setItem(LIFE_ENERGY_KEY, dataStr);
                    try {
                        const parsed = typeof profileData.life_energy_data === 'string' ? JSON.parse(profileData.life_energy_data) : profileData.life_energy_data;
                        if (parsed.trueHourlyRate) {
                            setTrueHourlyRate(parsed.trueHourlyRate);
                            localStorage.setItem(HOURLY_RATE_KEY, parsed.trueHourlyRate.toString());
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
            if (!navigator.onLine || !isInitialized.current) return;
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            // Sync Currency (Table)
            const settingsRef = doc(db, 'user_settings', currentUser.uid);
            await setDoc(settingsRef, {
                user_id: currentUser.uid,
                currency_code: currency.code,
                updated_at: new Date().toISOString()
            }, { merge: true });

            // Sync Theme, Visibility & Life Energy (user_profiles doc)
            const savedLifeEnergy = localStorage.getItem(LIFE_ENERGY_KEY);
            const profileRef = doc(db, 'user_profiles', currentUser.uid);
            await setDoc(profileRef, {
                theme: theme,
                hideAmounts: hideAmounts,
                ...(savedLifeEnergy ? { life_energy_data: savedLifeEnergy } : {}),
                updated_at: new Date().toISOString()
            }, { merge: true });

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
