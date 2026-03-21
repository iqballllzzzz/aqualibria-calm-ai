import { useEffect } from 'react';

const REDIRECT_URL = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSMuPMqBAbrIWVyxgoKMUXVDxP21AJSE_2kFmmIOYeH8gPrONYK6ccL-I&s=10';

export default function AntiDevtools() {
  useEffect(() => {
    const redirect = () => {
      if (window.location.href !== REDIRECT_URL) {
        window.location.replace(REDIRECT_URL);
      }
    };

    const onContext = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', onContext);

    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        redirect();
      }
    };
    document.addEventListener('keydown', onKey);

    const inspectDevtoolsLibraries = () => {
      const hasErudaGlobal = Boolean((window as Window & { eruda?: unknown }).eruda);
      const hasErudaDom = Boolean(
        document.getElementById('eruda') ||
          document.querySelector('.eruda-container, [class*="eruda"], [id*="eruda"]')
      );

      if (hasErudaGlobal || hasErudaDom) {
        redirect();
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;

          if (node.tagName === 'SCRIPT') {
            const script = node as HTMLScriptElement;
            const src = script.src?.toLowerCase() || '';
            const inline = script.textContent?.toLowerCase() || '';
            if (src.includes('eruda') || inline.includes('eruda.init')) {
              redirect();
              return;
            }
          }

          const html = node.outerHTML?.toLowerCase() || '';
          if (html.includes('eruda')) {
            redirect();
            return;
          }
        }
      }

      inspectDevtoolsLibraries();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    const check = () => {
      const wDiff = window.outerWidth - window.innerWidth > 160;
      const hDiff = window.outerHeight - window.innerHeight > 160;
      if (wDiff || hDiff) {
        redirect();
      }

      inspectDevtoolsLibraries();
    };

    const interval = setInterval(check, 800);
    check();

    return () => {
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('keydown', onKey);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return null;
}
