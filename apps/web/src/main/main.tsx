import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from '../App'
import { changeLanguage, initialLanguage } from '../i18n/i18n'
import { localizedPath, stripLocalePrefix } from '../seo/routes'
import '../index.css'

void startApp()

async function startApp() {
  const language = initialLanguage()
  const pagePath = window.location.pathname === '/' ? '/solve' : stripLocalePrefix(window.location.pathname)
  const localizedDestination = localizedPath(pagePath, language)

  if (window.location.pathname !== localizedDestination) {
    const destination = `${localizedDestination}${window.location.search}${window.location.hash}`
    window.history.replaceState(null, '', destination)
  }

  try {
    await changeLanguage(language)
  } finally {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>,
    )
  }
}
