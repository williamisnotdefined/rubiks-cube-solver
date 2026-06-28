import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from '../App'
import { changeLanguage, languageFromRoute } from '../i18n/i18n'
import '../index.css'

void startApp()

async function startApp() {
  try {
    await changeLanguage(languageFromRoute())
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
