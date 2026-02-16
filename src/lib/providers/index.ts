import type { Provider, SummarizationProvider } from "../types.js";

export async function getProvider(type: SummarizationProvider): Promise<Provider> {
  switch (type) {
    case "cli": {
      const mod = await import("./cli.js");
      return mod.cliProvider;
    }
    default: {
      const mod = await import("./api.js");
      return mod.apiProvider;
    }
  }
}
