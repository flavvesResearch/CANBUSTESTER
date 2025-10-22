const STORAGE_KEY = "canbus-theme";
const root = document.documentElement;

const THEME_DARK = "dark";
const THEME_LIGHT = "light";

function resolveInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === THEME_DARK || stored === THEME_LIGHT) {
        return stored;
    }
    const attr = root.getAttribute("data-theme");
    if (attr === THEME_DARK || attr === THEME_LIGHT) {
        return attr;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? THEME_DARK : THEME_LIGHT;
}

function updateToggleButtons(theme) {
    const isDark = theme === THEME_DARK;
    const label = isDark ? "🌞 Aydınlık Mod" : "🌙 Koyu Mod";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
        button.textContent = label;
        button.setAttribute("aria-label", isDark ? "Aydınlık moda geç" : "Koyu moda geç");
    });
}

function applyTheme(theme, persist = true) {
    const nextTheme = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
    root.setAttribute("data-theme", nextTheme);
    updateToggleButtons(nextTheme);
    if (persist) {
        localStorage.setItem(STORAGE_KEY, nextTheme);
    }
}

function toggleTheme() {
    const current = root.getAttribute("data-theme") === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
    const next = current === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
    applyTheme(next);
}

const initialTheme = resolveInitialTheme();
applyTheme(initialTheme, false);

document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-toggle]");
    if (!button) return;
    event.preventDefault();
    toggleTheme();
});

const media = window.matchMedia("(prefers-color-scheme: dark)");
if (media?.addEventListener) {
    media.addEventListener("change", (event) => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === THEME_DARK || stored === THEME_LIGHT) {
            return;
        }
        applyTheme(event.matches ? THEME_DARK : THEME_LIGHT, false);
    });
}
