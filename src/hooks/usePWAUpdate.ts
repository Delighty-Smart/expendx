
import { useEffect } from 'react';

/**
 * Lightweight PWA update hook.
 * 
 * Checks for SW updates every 5 minutes.
 * Since the SW auto-activates with skipWaiting(), no user prompt is needed.
 * When a new SW takes control, we silently reload to pick up the new version.
 */
export const usePWAUpdate = () => {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        let interval: ReturnType<typeof setInterval>;

        const setup = async () => {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return;

            // Check for updates every 5 minutes
            interval = setInterval(() => {
                reg.update().catch(() => {
                    // Silently ignore update check failures (e.g., offline)
                });
            }, 5 * 60 * 1000);

            // Trigger an immediate check on mount
            reg.update().catch(() => { });
        };

        // When a new SW takes control, reload to get fresh content
        const onControllerChange = () => {
            // Only reload if the document is visible (don't reload background tabs)
            if (document.visibilityState === 'visible') {
                window.location.reload();
            }
        };

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
        setup();

        return () => {
            clearInterval(interval);
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        };
    }, []);
};
