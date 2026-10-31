// Timers in a worker keep ticking when the main thread is busy; the audio clock does the real timing.
let id: ReturnType<typeof setInterval> | undefined;

self.onmessage = (e: MessageEvent<{ cmd: "start"; ms: number } | { cmd: "stop" }>) => {
  clearInterval(id);
  if (e.data.cmd === "start") id = setInterval(() => self.postMessage(0), e.data.ms);
};
