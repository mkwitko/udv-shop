import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";

/**
 * Confirmação destrutiva (§16 do brief): substitui window.confirm. O CTA diz a
 * ação de verdade ("Reembolsar pedido"), nunca um "Confirmar" genérico.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  dismissLabel = "Cancelar",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  /** Rótulo do botão que desiste da ação. "Cancelar" confunde quando a própria ação
   *  é cancelar algo — aí a saída é "Voltar". */
  dismissLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm rounded-[1.25rem] bg-elevated p-6 shadow-[var(--shadow-card)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="font-bold font-display text-lg tracking-tight">{title}</h2>
            {children && <div className="mt-2 text-[0.95rem] text-muted">{children}</div>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
                {dismissLabel}
              </Button>
              <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
                {busy ? "Um momento…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
