import { Moon, Sun } from "lucide-react";
import { useTheme } from "#/lib/theme";

export function ThemeToggle() {
  const { resolved, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={resolved === "dark" ? "Usar tema claro" : "Usar tema escuro"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line text-muted sm:h-9 sm:w-9 transition-colors [transition-duration:var(--dur)] hover:border-line-strong hover:text-ink"
    >
      {resolved === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
