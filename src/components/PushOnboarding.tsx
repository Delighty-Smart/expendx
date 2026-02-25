import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const PushOnboarding = () => {
    useEffect(() => {
        const requestNativePermissions = async () => {
            if (!Capacitor.isNativePlatform()) return;

            try {
                // Check current status
                let permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    // Trigger the native Android 13+ OS prompt directly
                    await PushNotifications.requestPermissions();
                }
            } catch (e) {
                console.error("Native push permission error:", e);
            }
        };

        requestNativePermissions();
    }, []);

    // Return nothing; the prompt is handled entirely by the native OS now
    return null;
};

export default PushOnboarding;
