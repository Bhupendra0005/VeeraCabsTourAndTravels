"use client";

import { useEffect, useRef } from "react";
import { ui } from "@/components/ui/styles";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      theme: "dark";
      appearance: "always";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Cloudflare Turnstile widget. The token is verified server-side; without a site key it renders nothing (local dev). */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    const el = ref.current;
    let widgetId: string | undefined;
    let cancelled = false;

    const mount = () => {
      if (cancelled || !window.turnstile) return;
      widgetId = window.turnstile.render(el, {
        sitekey: SITE_KEY,
        theme: "dark",
        // always show the widget, so visitors can see the check is running (it used to stay hidden until interaction was needed)
        appearance: "always",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    if (window.turnstile) {
      mount();
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className={ui.turnstile} />;
}
