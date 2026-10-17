import type { SimulatedProvider } from "./types.js";

export class SimulatorRegistry {
  private readonly providers = new Map<string, SimulatedProvider>();

  register(provider: SimulatedProvider): void {
    this.providers.set(provider.identity.id, provider);
  }

  get(id: string): SimulatedProvider | undefined {
    return this.providers.get(id);
  }

  list(): readonly SimulatedProvider[] {
    return Array.from(this.providers.values());
  }
}
