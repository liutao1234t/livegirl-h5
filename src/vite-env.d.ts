/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_DEEPSEEK_API_KEY: string;
  readonly VITE_DEEPSEEK_MODEL: string;
  readonly VITE_DEEPSEEK_BASE_URL: string;
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

