
import { useState, useEffect, useCallback } from 'react';

export const usePWAUpdate = () => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (!reg) return;
                setRegistration(reg);

                // Check for updates periodically
                const interval = setInterval(() => {
                    reg.update();
                }, 60 * 60 * 1000); // Check every hour

                // Listen for new service worker waiting
                const onUpdateFound = () => {
                    const newSW = reg.installing;
                    if (newSW) {
                        newSW.addEventListener('statechange', () => {
                            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                                setUpdateAvailable(true);
                            }
                        });
                    }
                };

                reg.addEventListener('updatefound', onUpdateFound);

                // Also check if there's already one waiting (e.g., from a previous session)
                if (reg.waiting) {
                    setUpdateAvailable(true);
                }

                return () => {
                    clearInterval(interval);
                    reg.removeEventListener('updatefound', onUpdateFound);
                };
            });
        }
    }, []);

    const updateApp = useCallback(() => {
        if (registration && registration.waiting) {
            // Send message to SW to skip waiting
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });

            // Reload page when the new SW takes over
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        } else {
            // Fallback: just reload if something went wrong
            window.location.reload();
        }
    }, [registration]);

    return { updateAvailable, updateApp };
};
