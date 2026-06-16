/**
 * Provider factory. Picks the configured adapter from the environment.
 *
 * Only the `CommunicationService` should call this.
 */
import type { CommunicationProvider } from "./CommunicationProvider";
import { MockProvider } from "./MockProvider";
import {
  Dialog360Provider,
  MetaCloudProvider,
  TwilioProvider,
} from "./StubProviders";

export type ProviderName = "mock" | "meta" | "twilio" | "dialog360";

export function createProvider(name: ProviderName): CommunicationProvider {
  switch (name) {
    case "mock":
      return new MockProvider();
    case "meta":
      return new MetaCloudProvider();
    case "twilio":
      return new TwilioProvider();
    case "dialog360":
      return new Dialog360Provider();
    default: {
      const exhaustive: never = name;
      throw new Error(`Unknown provider: ${exhaustive as string}`);
    }
  }
}
