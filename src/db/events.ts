type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeDb(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyDbChanged(): void {
  listeners.forEach((listener) => listener());
}
