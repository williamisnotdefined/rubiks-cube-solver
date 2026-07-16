import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router'
import App from '../App'
import { changeLanguage } from '../i18n/i18n'
import { localeFromPathname } from '../seo/routes'
import '../index.css'
import { mountApp } from './mountApp'

void startApp()

async function startApp() {
  const root = document.getElementById('root')
  if (root === null) {
    throw new Error('missing #root application element')
  }

  const language = localeFromPathname(window.location.pathname)

  try {
    await changeLanguage(language)
  } finally {
    mountApp(
      root,
      <StrictMode>
        <BrowserRouter>
          <App initialStatic={root.dataset.ssg === 'true'} />
        </BrowserRouter>
      </StrictMode>,
    )
  }
}
