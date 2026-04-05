import React, { createContext, useContext, useState, useCallback } from 'react';

interface HamburgerMenuContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const HamburgerMenuContext = createContext<HamburgerMenuContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function HamburgerMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return React.createElement(
    HamburgerMenuContext.Provider,
    { value: { isOpen, open, close, toggle } },
    children
  );
}

export function useHamburgerMenu() {
  return useContext(HamburgerMenuContext);
}
