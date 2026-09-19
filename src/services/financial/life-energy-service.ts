/**
 * Life Energy Service
 *
 * Converts financial monetary prices into hours of human life energy.
 * Data source: enhancedOfflineManager settings.
 */

import type { ToolResult, ExecutionContext } from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { lucentEventBus } from '@/services/ai/event-bus';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';

function getLifeEnergySettings(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ hourlyRate: number; mode: string; hoursPerWeek: number }>> {
  const settings = enhancedOfflineManager.getSettings();
  const hourlyRate = Number(settings?.hourly_rate || 2500);

  return Promise.resolve({
    success: true,
    data: {
      hourlyRate,
      mode: settings?.life_energy_mode || 'currency',
      hoursPerWeek: 40,
    },
    source: 'life_energy',
    timestamp: Date.now(),
  });
}

function calculateLifeEnergyCost(
  params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ price: number; hoursOfLife: number; formatted: string }>> {
  const { price } = params;
  const settings = enhancedOfflineManager.getSettings();
  const hourlyRate = Math.max(1, Number(settings?.hourly_rate || 2500));
  const p = Number(price || 0);

  const hoursOfLife = Number((p / hourlyRate).toFixed(1));

  return Promise.resolve({
    success: true,
    data: {
      price: p,
      hoursOfLife,
      formatted: `${hoursOfLife} hrs of Life Energy`,
    },
    source: 'life_energy',
    timestamp: Date.now(),
  });
}

import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

async function updateLifeEnergyRate(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ updated: boolean; newRate: number }>> {
  const { hourlyRate } = params;
  const rate = Number(hourlyRate);

  if (ctx.userId) {
    await setDoc(doc(db, 'user_settings', ctx.userId), {
      user_id: ctx.userId,
      hourly_rate: rate,
      updated_at: new Date().toISOString()
    }, { merge: true });
  }

  ctx.invalidateQueries?.(['settings']);
  lucentEventBus.emit('settings:updated', { hourly_rate: rate }, 'life-energy-service');

  return {
    success: true,
    data: { updated: true, newRate: rate },
    source: 'life_energy',
    timestamp: Date.now(),
  };
}

export function registerLifeEnergyService(): void {
  capabilityRegistry.registerModule({
    id: 'life_energy',
    name: 'Life Energy Service',
    description: 'Calculates monetary prices in terms of working hours of life energy based on earning rate.',
    toolNames: ['getLifeEnergySettings', 'calculateLifeEnergyCost', 'updateLifeEnergyRate'],
    version: '1.0.0',
  });

  capabilityRegistry.registerTool({
    name: 'getLifeEnergySettings',
    description: 'Get user\'s earning rate per hour and life energy calculation settings.',
    module: 'life_energy',
    inputSchema: {},
    outputDescription: '{ hourlyRate, mode, hoursPerWeek }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getLifeEnergySettings);

  capabilityRegistry.registerTool({
    name: 'calculateLifeEnergyCost',
    description: 'Convert a price amount into hours of working life energy.',
    module: 'life_energy',
    inputSchema: {
      price: { type: 'number', description: 'Price amount to convert', required: true },
    },
    outputDescription: '{ price, hoursOfLife, formatted }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: false,
  }, calculateLifeEnergyCost);

  capabilityRegistry.registerTool({
    name: 'updateLifeEnergyRate',
    description: 'Update the user\'s hourly earning rate for life energy conversions.',
    module: 'life_energy',
    inputSchema: {
      hourlyRate: { type: 'number', description: 'New hourly earning rate', required: true },
    },
    outputDescription: '{ updated: boolean, newRate: number }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, updateLifeEnergyRate);
}
