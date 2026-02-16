
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

/**
 * Silent PWA update component.
 * No visible UI — just activates the update hook.
 * The SW auto-activates and the page reloads seamlessly.
 */
const PWAUpdatePrompt = () => {
    usePWAUpdate();
    return null;
};

export default PWAUpdatePrompt;
