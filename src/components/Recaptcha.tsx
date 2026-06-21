import { useEffect, useRef, useState, useCallback } from 'react';

// --- PASTE YOUR CUSTOM RECAPTCHA v2 SITE KEY HERE ---
// If you don't want to use Vercel environment variables, you can paste your actual Site Key here:
const HARDCODED_SITE_KEY = ''; 

interface RecaptchaProps {
  onVerify: (token: string | null) => void;
  resetTrigger?: any;
}

export function Recaptcha({ onVerify, resetTrigger }: RecaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);

  // Expose verify token callback
  const handleVerify = useCallback((token: string) => {
    onVerify(token);
  }, [onVerify]);

  // Handle expired/error tokens callback
  const handleReset = useCallback(() => {
    onVerify(null);
  }, [onVerify]);

  useEffect(() => {
    let isMounted = true;

    // Helper to render recaptcha
    const renderWidget = () => {
      if (!isMounted || !containerRef.current) return;
      if (typeof window === 'undefined' || !(window as any).grecaptcha || !(window as any).grecaptcha.render) {
        setError('reCAPTCHA script not loaded yet.');
        return;
      }

      setError(null);
      try {
        const siteKey = HARDCODED_SITE_KEY || (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string) || '6LeIxAcTAAAAAJcZVRqyGUR862MAIDR5tc650p68';
        
        // If already rendered, reset it, don't re-render
        if (widgetIdRef.current !== null) {
          try {
            (window as any).grecaptcha.reset(widgetIdRef.current);
            return;
          } catch (resetErr) {
            console.warn('grecaptcha reset warning:', resetErr);
          }
        }

        widgetIdRef.current = (window as any).grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: handleVerify,
          'expired-callback': handleReset,
          'error-callback': () => {
            setError('reCAPTCHA encountered an error.');
            handleReset();
          },
        });
      } catch (err: any) {
        console.error('reCAPTCHA render error:', err);
      }
    };

    // If script isn't loaded, load it dynamically to be extremely robust!
    if (!(window as any).grecaptcha || !(window as any).grecaptcha.render) {
      const scriptId = 'google-recaptcha-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }

      const checkInterval = setInterval(() => {
        if ((window as any).grecaptcha && (window as any).grecaptcha.render) {
          clearInterval(checkInterval);
          setScriptLoaded(true);
          renderWidget();
        }
      }, 200);

      return () => {
        isMounted = false;
        clearInterval(checkInterval);
      };
    } else {
      setScriptLoaded(true);
      // Script is loaded, wait a tick to ensure container is ready in DOM
      const timer = setTimeout(() => {
        renderWidget();
      }, 100);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [handleVerify, handleReset, resetTrigger]);

  // Handle manual/external reset trigggers (like switching between login/signup)
  useEffect(() => {
    if (widgetIdRef.current !== null && (window as any).grecaptcha) {
      try {
        (window as any).grecaptcha.reset(widgetIdRef.current);
        onVerify(null);
      } catch (e) {
        console.warn("reCAPTCHA failed to reset on trigger update:", e);
      }
    }
  }, [resetTrigger, onVerify]);

  return (
    <div className="flex flex-col items-center justify-center py-2">
      {error && (
        <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-2">
          {error}
        </span>
      )}
      <div 
        ref={containerRef} 
        id="recaptcha-container" 
        className="g-recaptcha overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-2 shadow-sm scale-90 md:scale-100 origin-center"
      ></div>
      {!scriptLoaded && (
        <span className="text-[8px] text-slate-400 font-semibold uppercase tracking-widest mt-2 animate-pulse">
          Securing session... Loading reCAPTCHA
        </span>
      )}
    </div>
  );
}
