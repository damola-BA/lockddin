"use client";

import { createContext, useContext } from "react";
import { getDictionary, type Dictionary } from "./index";

// Locale for client components. Server components resolve the dictionary
// directly with getDictionary(provider.language); client subtrees read it from
// this provider (wrapped around them by the server page) via useT().
const LocaleContext = createContext<string>("en");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): string {
  return useContext(LocaleContext);
}

export function useT(): Dictionary {
  return getDictionary(useContext(LocaleContext));
}
