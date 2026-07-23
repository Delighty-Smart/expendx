import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { BiometricAuth, BiometryError } from '@aparajita/capacitor-biometric-auth';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';

const BIOMETRIC_ENABLED_KEY = 'expendx_biometric_enabled';

/**
 * useBiometricLock
 *
 * Prompts biometric authentication when the app loads or resumes from background,
 * if the user has opted-in via Settings. Also enables/disables the system privacy screen.
 *
 * Returns helpers to check capability and toggle the setting.
 */
export const useBiometricLock = () => {
    const isLocked = useRef(false);

    const isBiometricEnabled = useCallback(() => {
        return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    }, []);

    const setBiometricEnabled = useCallback((enabled: boolean) => {
        localStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
        if (Capacitor.isNativePlatform()) {
            if (enabled) {
                PrivacyScreen.enable().catch(console.error);
            } else {
                PrivacyScreen.disable().catch(console.error);
            }
        }
    }, []);

    /** Returns true if the device supports biometric auth */
    const checkBiometricAvailability = useCallback(async (): Promise<boolean> => {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const info = await BiometricAuth.checkBiometry();
            return info.isAvailable;
        } catch {
            return false;
        }
    }, []);

    /** Prompt biometric — returns true if authenticated */
    const authenticate = useCallback(async (): Promise<boolean> => {
        if (!Capacitor.isNativePlatform()) return true;
        try {
            await BiometricAuth.authenticate({
                reason: 'Verify your identity to access Lucent',
                cancelTitle: 'Cancel',
                iosFallbackTitle: 'Use Passcode',
                allowDeviceCredential: true,
            });
            return true;
        } catch (e) {
            const err = e as BiometryError;
            // User cancelled or hardware not available — don't lock them out
            console.warn('Biometric auth failed:', err.message);
            return false;
        }
    }, []);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // Apply Privacy Screen on initial load based on setting
        if (isBiometricEnabled()) {
            PrivacyScreen.enable().catch(console.error);

            // Initial load biometric prompt
            (async () => {
                isLocked.current = true;
                const ok = await authenticate();
                if (ok) {
                    isLocked.current = false;
                }
            })();
        } else {
            PrivacyScreen.disable().catch(console.error);
        }

        let listener: any;
        CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
            if (!isBiometricEnabled()) return;

            if (!isActive) {
                // App going to background — arm the lock
                isLocked.current = true;
            } else if (isActive && isLocked.current) {
                // App resumed — prompt immediately
                const ok = await authenticate();
                if (ok) {
                    isLocked.current = false;
                }
                // If auth failed, user tapped cancel — keep locked; next resume will prompt again
            }
        }).then(l => { listener = l; });

        return () => {
            if (listener) listener.remove();
        };
    }, [isBiometricEnabled, authenticate]);

    return {
        isBiometricEnabled,
        setBiometricEnabled,
        checkBiometricAvailability,
        authenticate,
    };
};
