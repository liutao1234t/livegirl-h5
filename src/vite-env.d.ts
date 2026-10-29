/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_API_KEY: string;
  readonly VITE_DEEPSEEK_MODEL: string;
  readonly VITE_DEEPSEEK_BASE_URL: string;
  readonly VITE_H5_API_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  iapProductId?: string;
  onIAPSuccess?: (payload?: unknown) => void;
  onIAPFail?: (payload?: unknown) => void;
  onIAPResult?: (payload?: unknown) => void;
  iapSuccess?: (payload?: unknown) => void;
  iapFail?: (payload?: unknown) => void;
}

