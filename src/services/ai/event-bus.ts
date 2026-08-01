/**
 * Lucent Event Bus
 *
 * Lightweight pub/sub event system that keeps the AI context fresh.
 * Every mutation (transaction added, budget changed, goal updated) emits
 * an event so interested services can react immediately.
 *
 * Flow: Tool executes mutation → emits event → Context Builder refreshes → AI has fresh data
 */

import type { LucentEvent, LucentEventType } from '@/types/lucent-capability-types';

type EventHandler<T = any> = (event: LucentEvent<T>) => void;

class LucentEventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private recentEvents: LucentEvent[] = [];
  private readonly MAX_HISTORY = 50;

  /** Subscribe to a specific event type */
  on<T = any>(eventType: LucentEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler as EventHandler);
    };
  }

  /** Subscribe to an event type, but only fire once */
  once<T = any>(eventType: LucentEventType, handler: EventHandler<T>): () => void {
    const wrappedHandler: EventHandler<T> = (event) => {
      handler(event);
      this.handlers.get(eventType)?.delete(wrappedHandler as EventHandler);
    };
    return this.on(eventType, wrappedHandler);
  }

  /** Subscribe to ALL events (wildcard) */
  onAny(handler: EventHandler): () => void {
    if (!this.handlers.has('*')) {
      this.handlers.set('*', new Set());
    }
    this.handlers.get('*')!.add(handler);
    return () => {
      this.handlers.get('*')?.delete(handler);
    };
  }

  /** Emit an event to all subscribers */
  emit<T = any>(type: LucentEventType, data: T, source: string): void {
    const event: LucentEvent<T> = {
      type,
      data,
      timestamp: Date.now(),
      source,
    };

    // Store in history
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.MAX_HISTORY) {
      this.recentEvents.shift();
    }

    // Notify specific subscribers
    const specificHandlers = this.handlers.get(type);
    if (specificHandlers) {
      specificHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (err) {
          console.error(`[EventBus] Handler error for ${type}:`, err);
        }
      });
    }

    // Notify wildcard subscribers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (err) {
          console.error(`[EventBus] Wildcard handler error:`, err);
        }
      });
    }

    console.log(`[EventBus] 📡 ${type} from ${source}`);
  }

  /** Get recent events (for debugging or AI context) */
  getRecentEvents(limit = 10): LucentEvent[] {
    return this.recentEvents.slice(-limit);
  }

  /** Clear all subscriptions (for cleanup) */
  clear(): void {
    this.handlers.clear();
    this.recentEvents = [];
  }
}

/** Global singleton */
export const lucentEventBus = new LucentEventBus();
