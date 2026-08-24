import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aicoreescape.prismrelay",
  appName: "AI Core Escape",
  webDir: "dist/public",
  android: {
    allowMixedContent: false,
  },
};

export default config;
