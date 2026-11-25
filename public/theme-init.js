(function () {
  var theme = 'system';
  try {
    var stored = JSON.parse(localStorage.getItem('outlethub:preferences') || 'null');
    if (stored && stored.state && typeof stored.state.theme === 'string')
      theme = stored.state.theme;
  } catch (error) {
    theme = 'system';
  }
  var dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
