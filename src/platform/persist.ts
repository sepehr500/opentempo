// Settings persist on the device (IndexedDB). No accounts, no server.
import { createStore, get, set } from "idb-keyval";

const store = createStore("tempo", "kv");

export const load = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    return ((await get(key, store)) as T | undefined) ?? fallback;
  } catch {
    return fallback;
  }
};

export const save = <T>(key: string, value: T): Promise<void> => set(key, value, store).catch(() => {});

/** Ask the browser not to evict our data under storage pressure. */
export const persistStorage = () => navigator.storage?.persist?.().catch(() => false);
