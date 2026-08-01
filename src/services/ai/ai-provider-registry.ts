/**
 * Lucent AI Provider Registry
 * 
 * Singleton that manages all AI providers. 
 * The app always has a MockChatProvider as fallback.
 * Cloud or local providers register themselves and take priority.
 */

import type { AIProvider, AIProviderType, ChatAIProvider } from '@/types/ai-types';

class AIProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private listeners: Set<() => void> = new Set();

  /** Register a provider. Replaces any existing provider with the same id. */
  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
    this.notifyListeners();
  }

  /** Unregister a provider by id */
  unregister(id: string): void {
    const provider = this.providers.get(id);
    if (provider) {
      provider.dispose().catch(console.error);
      this.providers.delete(id);
      this.notifyListeners();
    }
  }

  /** Get the best available provider for a given type, preferring ready providers */
  getProvider<T extends AIProvider>(type: AIProviderType): T | undefined {
    const candidates = Array.from(this.providers.values())
      .filter(p => p.type === type)
      .sort((a, b) => {
        // Prefer ready providers
        if (a.status === 'ready' && b.status !== 'ready') return -1;
        if (b.status === 'ready' && a.status !== 'ready') return 1;
        // Prefer offline/local providers when both ready
        if (a.isOffline && !b.isOffline) return -1;
        if (b.isOffline && !a.isOffline) return 1;
        return 0;
      });

    return candidates[0] as T | undefined;
  }

  /** Get the chat provider (most used) */
  getChatProvider(): ChatAIProvider | undefined {
    return this.getProvider<ChatAIProvider>('chat');
  }

  /** Get all providers of a given type */
  getProviders(type?: AIProviderType): AIProvider[] {
    const all = Array.from(this.providers.values());
    if (type) return all.filter(p => p.type === type);
    return all;
  }

  /** Get a specific provider by id */
  getById(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  /** Check if any provider of a type is ready */
  isAvailable(type: AIProviderType): boolean {
    return this.getProviders(type).some(p => p.status === 'ready');
  }

  /** Subscribe to registry changes */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn());
  }

  /** Initialize all registered providers */
  async initializeAll(): Promise<void> {
    const promises = Array.from(this.providers.values()).map(p =>
      p.initialize().catch(err => {
        console.warn(`Failed to initialize provider ${p.id}:`, err);
      })
    );
    await Promise.allSettled(promises);
  }

  /** Dispose all providers */
  async disposeAll(): Promise<void> {
    const promises = Array.from(this.providers.values()).map(p =>
      p.dispose().catch(console.error)
    );
    await Promise.allSettled(promises);
    this.providers.clear();
  }
}

/** Global singleton */
export const aiRegistry = new AIProviderRegistry();
