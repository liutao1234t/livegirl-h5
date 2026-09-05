import { openSealed, type SealedBlob } from "./sealed";

const SEALED: SealedBlob = {
  k: "zNoFnWGQdi+0V7nMtzzv2tjJqgn2VBSB2Z1zgaoeVAo=",
  i: "vOALdcRv2Qpv9xDs",
  t: "pTSJDdHyglZvJChBnhZxsg==",
  c: "HoGoQdx38ynrGzoHVg94ZbQjTlBIQqYM/+3a8/woDTa1C+s=",
};

let cached: Promise<string | null> | null = null;

export function resolveSupportApiKey() {
  if (cached) return cached;
  cached = (async () => {
    const fromEnv = import.meta.env.VITE_DEEPSEEK_API_KEY?.trim();
    if (fromEnv) return fromEnv;
    return openSealed(SEALED);
  })();
  return cached;
}
