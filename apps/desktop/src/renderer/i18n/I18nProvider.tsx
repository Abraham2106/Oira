import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { getBridge } from "../bridge/oira"
import {
  DEFAULT_LOCALE,
  translate,
  type Locale,
} from "./dictionary"

export type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const bridge = useMemo(() => getBridge(), [])
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    let cancelled = false
    bridge
      .getSettings()
      .then((settings) => {
        if (!cancelled && settings.uiLocale !== locale) {
          setLocaleState(settings.uiLocale)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [bridge])

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next)
      void bridge.saveSettings({ uiLocale: next }).catch(() => undefined)
    },
    [bridge],
  )

  const t = useCallback((key: string) => translate(locale, key), [locale])

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider")
  }
  return value
}
