import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { MessageReader } from '@solimanware/capacitor-sms-reader';


const PushOnboarding = () => {
    useEffect(() => {
        const requestNativePermissions = async () => {
            if (!Capacitor.isNativePlatform()) return;

            try {
                // 1. Push notifications
                let permStatus = await PushNotifications.checkPermissions();
                if (permStatus.receive === 'prompt') {
                    await PushNotifications.requestPermissions();
                }

                // 2. SMS Inbox Sync
                const smsPerm = await MessageReader.checkPermissions().catch(() => null);
                if (smsPerm?.messages !== 'granted') {
                    await MessageReader.requestPermissions().catch(() => null);
                }
            } catch (e) {
                console.error("Native permission onboarding error:", e);
            }
        };

        requestNativePermissions();
    }, []);

    // Return nothing; handling occurs natively
    return null;
};

export default PushOnboarding;
