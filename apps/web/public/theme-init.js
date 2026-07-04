(function () {
  try {
    var root = document.documentElement;
    var theme = window.localStorage.getItem('rubiks-cube-solver-theme');

    root.classList.remove('dark', 'light');

    if (theme === 'dark' || theme === 'light') {
      root.dataset.theme = theme;
      root.classList.add(theme);
      return;
    }

    delete root.dataset.theme;

    var mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    var prefersDark = mediaQuery !== null && mediaQuery.matches;
    root.classList.add(prefersDark ? 'dark' : 'light');
  } catch {}
})();
