import { fetchH5DpKey, loginH5User } from "../data/h5AccountRepo";
import { useAppStore } from "../store/appStore";

let inflight: Promise<string | null> | null = null;
let cachedKey: string | null = null;
let cachedToken: string | null = null;

export function resolveSupportApiKey() {
  const fromEnv = import.meta.env.VITE_DEEPSEEK_API_KEY?.trim();
  if (fromEnv) return Promise.resolve(fromEnv);

  const accessToken = useAppStore.getState().accessToken;
  if (cachedKey && cachedToken && cachedToken === accessToken) {
    return Promise.resolve(cachedKey);
  }
  if (inflight) return inflight;

  inflight = (async () => {
    let id = useAppStore.getState().userId;
    let token = useAppStore.getState().accessToken;
    if (!token && id) {
      const login = await loginH5User(id);
      id = login?.userId || id;
      token = login?.accessToken ?? null;
      if (id && token) useAppStore.setState({ userId: id, accessToken: token });
    }
    if (!id || !token) return null;
    const key = await fetchH5DpKey(id, token);
    if (key) {
      cachedKey = key;
      cachedToken = token;
    }
    return key;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
