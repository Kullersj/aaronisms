export const THEME_STORAGE_KEY = 'theme';

/**
 * Runs in <head> before first paint, so there is no flash of the wrong theme. A saved choice wins;
 * otherwise the system preference decides.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
