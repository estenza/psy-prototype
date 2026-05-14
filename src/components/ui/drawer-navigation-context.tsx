"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

type DrawerNavigationContextValue = {
  openHref: (href: string, label?: string | null) => boolean;
};

const DrawerNavigationContext = createContext<DrawerNavigationContextValue | null>(null);

export function DrawerNavigationProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: DrawerNavigationContextValue;
}) {
  return (
    <DrawerNavigationContext.Provider value={value}>
      {children}
    </DrawerNavigationContext.Provider>
  );
}

export function useDrawerNavigation() {
  return useContext(DrawerNavigationContext);
}
