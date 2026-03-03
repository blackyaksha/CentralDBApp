// src/global.d.ts
interface PowerAppsContext {
  executePowerAutomate(flowName: string, params: Record<string, any>): Promise<any>;
}

declare const PowerApps: PowerAppsContext;
