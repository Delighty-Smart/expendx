// Helpers for keeping on-device data scoped to the signed-in user.
// Anything user-specific must be keyed this way so a second account on the same
// device can never read the first account's cached data.

export function userScopedKey(base: string, uid?: string | null): string {
  return `${base}_${uid || 'anon'}`;
}

export const LIFE_ENERGY_KEY_BASE = 'lucent_life_energy_data';
export const HOURLY_RATE_KEY_BASE = 'lucent_true_hourly_rate';
export const CHAT_CONVERSATIONS_KEY_BASE = 'lucent_chat_conversations';
export const CHAT_ACTIVE_KEY_BASE = 'lucent_active_chat_id';
export const CHAT_MESSAGES_KEY_BASE = 'lucent_chat_messages';