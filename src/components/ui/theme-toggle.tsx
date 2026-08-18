import { Moon, Sun } from "lucide-react";
import { useTheme } from "#/lib/theme";

export function ThemeToggle() {
  const { resolved, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={resolved === "dark" ? "Usar tema claro" : "Usar tema escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition-colors [transition-duration:var(--dur)] hover:border-line-strong hover:text-ink"
    >
      {resolved === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
