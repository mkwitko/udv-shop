import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "udv-theme";

/**
 * Roda inline no <head>, antes da primeira pintura. Sem isso a página nasce clara e
 * pisca para escura na hidratação — o flash é a razão do script existir.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}})();`;

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function readStoredTheme(): ThemePreference {
  if (typeof localStorage === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "system";
}

export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") {
    delete root.dataset.theme;
    localStorage.removeItem(THEME_STORAGE_KEY);
    return;
  }
  root.dataset.theme = preference;
  localStorage.setItem(THEME_STORAGE_KEY, preference);
}

/** `resolved` é o que está na tela; `preference` é o que o usuário escolheu. */
export function useTheme(): {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (next: ThemePreference) => void;
  toggle: () => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setPreferenceState(readStoredTheme());
    setSystemDark(systemPrefersDark());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  const setPreference = (next: ThemePreference) => {
    applyTheme(next);
    setPreferenceState(next);
  };

  return {
    preference,
    resolved,
    setPreference,
    toggle: () => setPreference(resolved === "dark" ? "light" : "dark"),
  };
}
