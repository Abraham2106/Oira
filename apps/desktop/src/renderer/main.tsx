import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { I18nProvider } from "./i18n/I18nProvider"
import "@oira/ui/styles.css"
import "./styles/index.css"

const root = document.getElementById("root")
if (!root) {
  throw new Error("Missing #root")
}

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </I18nProvider>
  </StrictMode>,
)
