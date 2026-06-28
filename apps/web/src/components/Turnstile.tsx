import { useEffect, useRef } from 'react';
import { turnstileSiteKey } from '../lib/config';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export function Turnstile({ onVerify, onExpire }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey) {
      onVerify('dev-bypass');
      return;
    }

    const scriptId = 'cf-turnstile-script';
    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: turnstileSiteKey,
        callback: onVerify,
        'expired-callback': onExpire,
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener('load', renderWidget);
    return () => {
      script?.removeEventListener('load', renderWidget);
    };
  }, [onVerify, onExpire]);

  if (!turnstileSiteKey) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Dev mode: captcha bypass enabled.
      </p>
    );
  }

  return <div ref={containerRef} />;
}
