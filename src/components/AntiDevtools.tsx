import { useEffect } from 'react';

export default function AntiDevtools() {
  useEffect(() => {
    // Hanya block keyboard shortcut buka devtools (tidak redirect, hanya cegah aksi)
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKey);

    // Nonaktifkan klik kanan
    const onContext = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', onContext);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('contextmenu', onContext);
    };
  }, []);

  return null;
}
