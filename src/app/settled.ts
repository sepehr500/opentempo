// A signal that follows `source`, but only once it has stopped changing for `ms`.
// For expensive side effects (lock-screen artwork, storage) that don't need every intermediate
// value while a knob is being turned. `flush()` publishes the pending value immediately.
import { createSignal, onCleanup, untrack, createEffect, type Accessor } from "solid-js";

export const settled = <T>(source: Accessor<T>, ms: number) => {
  const [value, setValue] = createSignal<T>(untrack(source));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { v: T } | null = null;
  const publish = () => {
    clearTimeout(timer);
    if (pending) setValue(() => pending!.v);
    pending = null;
  };
  createEffect(() => {
    pending = { v: source() };
    clearTimeout(timer);
    timer = setTimeout(publish, ms);
  });
  onCleanup(() => clearTimeout(timer));
  return { value, flush: publish };
};
