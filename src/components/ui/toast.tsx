import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, type ReactNode, use, useCallback, useRef, useState } from "react";

/**
 * Toast único do app (§86 do brief): frases humanas, 3–4s, sem empilhar dezenas.
 * `toast("Produto salvo.")` — tom de sucesso por padrão; `toast(msg, "error")` para falha.
 */
type Tone = "success" | "error";
type ToastItem = { id: number; message: string; tone: Tone };

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const reduce = useReducedMotion();

  const toast = useCallback((message: string, tone: Tone = "success") => {
    const id = nextId.current++;
    // no máximo 3 na tela — o mais velho sai
    setItems((current) => [...current.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext value={toast}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        <AnimatePresence>
          {items.map((item) => (
            <motion.p
              key={item.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto rounded-full px-4 py-2.5 font-medium text-sm shadow-lg ${
                item.tone === "error" ? "bg-danger text-white" : "bg-ink text-bg"
              }`}
            >
              {item.message}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const toast = use(ToastContext);
  if (!toast) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return toast;
}
