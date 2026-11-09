/// <reference types="vite/client" />

/** Build-time configuration. Declared so a typo is a type error, not a runtime one. */
interface ImportMetaEnv {
  /** Base path the app is served from: '/' on Cloudflare, '/<repo>/' on Pages. */
  readonly VITE_BASE?: string;
  /** Auth Worker origin. Unset means sign-in is not configured. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
