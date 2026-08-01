/**
 * User Service
 *
 * Provides user profile, preferences, currency configuration, and installed AI module information.
 * Data source: enhancedOfflineManager + AI download manager.
 */

import type { ToolResult, ExecutionContext } from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { lucentEventBus } from '@/services/ai/event-bus';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';
import { aiDownloadManager } from '@/services/ai/ai-download-manager';

// ─── Service Functions ───────────────────────────────────────────────────────

function getProfile(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ name: string; username: string; email?: string }>> {
  const profile = enhancedOfflineManager.getProfile();

  return Promise.resolve({
    success: true,
    data: {
      name: profile?.first_name || profile?.username || 'User',
      username: profile?.username || '',
      email: profile?.email,
    },
    source: 'user',
    timestamp: Date.now(),
  });
}

function getPreferences(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ currency: string; notifications: boolean }>> {
  const settings = enhancedOfflineManager.getSettings();

  return Promise.resolve({
    success: true,
    data: {
      currency: settings?.currency || 'NGN',
      notifications: settings?.notifications_enabled !== false,
    },
    source: 'user',
    timestamp: Date.now(),
  });
}

import { supabase } from '@/integrations/supabase/client';

async function updateCurrency(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ updated: boolean; currency: string }>> {
  const { currency } = params;
  const curr = String(currency).toUpperCase();

  await supabase.from('user_settings' as any).upsert({ user_id: ctx.userId, currency: curr });
  ctx.invalidateQueries?.(['settings']);
  lucentEventBus.emit('settings:updated', { currency: curr }, 'user-service');

  return {
    success: true,
    data: { updated: true, currency: curr },
    source: 'user',
    timestamp: Date.now(),
  };
}

function getInstalledModules(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ id: string; name: string; status: string }[]>> {
  const moduleIds = ['smollm2-360m', 'qwen-25-15b', 'whisper-tiny', 'paddle-ocr-tiny'];
  const modules = moduleIds.map(id => {
    const state = aiDownloadManager.getModuleState(id);
    return {
      id,
      name: id === 'smollm2-360m' ? 'SmolLM2 360M'
        : id === 'qwen-25-15b' ? 'Qwen 2.5 1.5B'
        : id === 'whisper-tiny' ? 'Whisper Tiny Speech'
        : 'PaddleOCR Tiny',
      status: state.status,
    };
  });

  return Promise.resolve({
    success: true,
    data: modules,
    source: 'user',
    timestamp: Date.now(),
  });
}

// ─── Registration ────────────────────────────────────────────────────────────

export function registerUserService(): void {
  capabilityRegistry.registerModule({
    id: 'user',
    name: 'User Service',
    description: 'User profile, preferences, currency settings, and installed AI module information.',
    toolNames: ['getProfile', 'getPreferences', 'updateCurrency', 'getInstalledModules'],
    version: '1.1.0',
  });

  capabilityRegistry.registerTool({
    name: 'getProfile',
    description: 'Get the current user\'s profile information: name and username.',
    module: 'user',
    inputSchema: {},
    outputDescription: '{ name, username, email? }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: false,
  }, getProfile);

  capabilityRegistry.registerTool({
    name: 'getPreferences',
    description: 'Get user preferences: currency setting and notification status.',
    module: 'user',
    inputSchema: {},
    outputDescription: '{ currency, notifications }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: false,
  }, getPreferences);

  capabilityRegistry.registerTool({
    name: 'updateCurrency',
    description: 'Update the user\'s preferred currency setting (e.g. NGN, USD, EUR, GBP).',
    module: 'user',
    inputSchema: {
      currency: { type: 'string', description: 'Currency symbol or code (e.g., NGN, USD)', required: true },
    },
    outputDescription: '{ updated: boolean, currency: string }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, updateCurrency);

  capabilityRegistry.registerTool({
    name: 'getInstalledModules',
    description: 'List all AI modules and their installation status (available, downloading, installed).',
    module: 'user',
    inputSchema: {},
    outputDescription: 'Array of { id, name, status }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: false,
  }, getInstalledModules);
}
