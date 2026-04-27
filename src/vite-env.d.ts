/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID?: string;
  readonly VITE_SESSION_SERVER_URL?: string;
  readonly VITE_DEV_INSTANCE_ID?: string;
}

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
