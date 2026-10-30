"use client";

import { createContext, useContext } from "react";

interface Words { currency: string; currencyOne: string }
const Ctx = createContext<Words>({ currency: "credits", currencyOne: "credit" });

/** Carries the admin's word for credits (chips, coins...) to every client component. */
export function CurrencyProvider({ value, children }: { value: Words; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** unit(1) gives "credit", unit(5) gives "credits", in the admin's own word. */
export function useUnit() {
  const w = useContext(Ctx);
  return (n: number) => (n === 1 ? w.currencyOne : w.currency);
}
export const useCurrencyWord = () => useContext(Ctx).currency;
