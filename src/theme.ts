export type Theme = 'dark' | 'light';

export function getTheme(): Theme {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

export function setTheme(t: Theme) {
  const r = document.documentElement;
  r.classList.remove('light', 'dark');
  r.classList.add(t);
  localStorage.setItem('theme', t);
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}
