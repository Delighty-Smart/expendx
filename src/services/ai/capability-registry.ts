/**
 * Lucent Capability Registry
 *
 * The central hub where every feature module registers its tools.
 * The AI discovers capabilities through this registry — it never has
 * direct knowledge of the data layer, database schema, or service internals.
 *
 * Think of it as the receptionist desk: the AI asks for a service,
 * the registry routes the request to the right handler.
 */

import type {
  ToolDefinition,
  ToolHandler,
  RegisteredTool,
  ModuleRegistration,
  ToolResult,
  ExecutionContext,
} from '@/types/lucent-capability-types';

class CapabilityRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private modules: Map<string, ModuleRegistration> = new Map();
  private listeners: Set<() => void> = new Set();

  // ─── Module Registration ─────────────────────────────────────────────

  /** Register a feature module */
  registerModule(module: ModuleRegistration): void {
    this.modules.set(module.id, module);
    console.log(`[CapabilityRegistry] 📦 Module registered: ${module.name} (${module.toolNames.length} tools)`);
    this.notify();
  }

  /** Register a single tool with its handler */
  registerTool(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
    console.log(`[CapabilityRegistry] 🔧 Tool registered: ${definition.name} [${definition.accessLevel}] (${definition.module})`);
    this.notify();
  }

  /** Unregister a module and all its tools */
  unregisterModule(moduleId: string): void {
    const module = this.modules.get(moduleId);
    if (module) {
      module.toolNames.forEach(name => this.tools.delete(name));
      this.modules.delete(moduleId);
      console.log(`[CapabilityRegistry] 🗑️ Module unregistered: ${module.name}`);
      this.notify();
    }
  }

  // ─── Discovery (AI-facing) ───────────────────────────────────────────

  /** Get all available tool definitions (metadata only — no handlers exposed) */
  getAvailableTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /** Get tools belonging to a specific module */
  getToolsByModule(moduleId: string): ToolDefinition[] {
    return this.getAvailableTools().filter(t => t.module === moduleId);
  }

  /** Get only read-only tools (safe for context building) */
  getReadOnlyTools(): ToolDefinition[] {
    return this.getAvailableTools().filter(t => t.accessLevel === 'read');
  }

  /** Get only write tools (mutations) */
  getWriteTools(): ToolDefinition[] {
    return this.getAvailableTools().filter(t => t.accessLevel === 'write');
  }

  /** Find a specific tool by name */
  findTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /** Check if a tool exists */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /** Get all registered modules */
  getModules(): ModuleRegistration[] {
    return Array.from(this.modules.values());
  }

  // ─── Execution ───────────────────────────────────────────────────────

  /**
   * Execute a tool by name.
   * The registry looks up the handler and runs it with the given params.
   * The AI never sees the handler — it only knows the tool name and params.
   */
  async executeTool(
    name: string,
    params: Record<string, any>,
    context: ExecutionContext,
  ): Promise<ToolResult> {
    const registered = this.tools.get(name);

    if (!registered) {
      return {
        success: false,
        error: `Tool "${name}" is not registered. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
        source: 'capability-registry',
        timestamp: Date.now(),
      };
    }

    const { definition, handler } = registered;

    // Validate required auth
    if (definition.requiresAuth && !context.userId) {
      return {
        success: false,
        error: `Tool "${name}" requires authentication but no userId was provided.`,
        source: definition.module,
        timestamp: Date.now(),
      };
    }

    // Validate required parameters
    for (const [paramName, paramDef] of Object.entries(definition.inputSchema)) {
      if (paramDef.required && (params[paramName] === undefined || params[paramName] === null)) {
        return {
          success: false,
          error: `Tool "${name}" requires parameter "${paramName}" (${paramDef.description}).`,
          source: definition.module,
          timestamp: Date.now(),
        };
      }
    }

    // Execute the handler
    try {
      console.log(`[CapabilityRegistry] ⚡ Executing: ${name}`, params);
      const result = await handler(params, context);
      console.log(`[CapabilityRegistry] ✅ ${name} completed (${result.success ? 'success' : 'failed'})`);
      return result;
    } catch (err: any) {
      console.error(`[CapabilityRegistry] ❌ ${name} threw:`, err);
      return {
        success: false,
        error: err.message || 'Unknown tool execution error',
        source: definition.module,
        timestamp: Date.now(),
      };
    }
  }

  // ─── Introspection (for system prompt) ───────────────────────────────

  /**
   * Generate a human-readable description of all capabilities.
   * Injected into the AI system prompt so it knows what tools exist.
   */
  describeCapabilities(): string {
    const modules = this.getModules();
    if (modules.length === 0) return 'No capabilities registered yet.';

    const sections = modules.map(mod => {
      const tools = this.getToolsByModule(mod.id);
      const toolLines = tools.map(t => {
        const params = Object.entries(t.inputSchema)
          .map(([k, v]) => `${k}${v.required ? '' : '?'}: ${v.type}`)
          .join(', ');
        const access = t.accessLevel === 'write' ? ' ⚠️ WRITE' : '';
        return `  - **${t.name}**(${params})${access}: ${t.description}`;
      });
      return `### ${mod.name}\n${toolLines.join('\n')}`;
    });

    return sections.join('\n\n');
  }

  // ─── Subscriptions ───────────────────────────────────────────────────

  /** Subscribe to registry changes (tools added/removed) */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }
}

/** Global singleton */
export const capabilityRegistry = new CapabilityRegistry();
