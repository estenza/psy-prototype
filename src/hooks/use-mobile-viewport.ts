"use client";

import { useEffect, useState } from "react";

export function useMobileViewport() {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 480px)");

    function syncViewport() {
      setIsMobileViewport(mediaQuery.matches);
    }

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  return isMobileViewport;
}
