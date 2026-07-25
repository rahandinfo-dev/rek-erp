type Listener = (open: boolean) => void;

const listeners = new Set<Listener>();

export function subscribeAiAssistant(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openAiAssistant() {
  listeners.forEach((l) => l(true));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rek:ai-assistant-open"));
  }
}

export function closeAiAssistant() {
  listeners.forEach((l) => l(false));
}

export function toggleAiAssistant() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rek:ai-assistant-toggle"));
  }
}
