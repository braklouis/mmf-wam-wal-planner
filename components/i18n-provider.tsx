'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { DEFAULT_LOCALE, type Locale, translateText } from '@/lib/i18n';

type I18nContextValue = {
  locale: Locale;
  t: (source: string) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: (source) => source,
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (source) => translateText(locale, source),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
