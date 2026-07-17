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
  } catch (error) {
    console.error('Unable to load application language resources', error)
    showStartupError()
    return
  }

  mountApp(
    root,
    <StrictMode>
      <BrowserRouter>
        <App initialStatic={root.dataset.ssg === 'true'} />
      </BrowserRouter>
    </StrictMode>,
  )
}

function showStartupError() {
  const alert = document.createElement('div')
  const message = document.createElement('span')
  const retry = document.createElement('button')

  alert.className =
    'fixed inset-x-4 bottom-4 z-[100] flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-lg'
  alert.setAttribute('role', 'alert')
  message.textContent = 'The application could not start.'
  retry.className =
    'shrink-0 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
  retry.textContent = 'Retry'
  retry.type = 'button'
  retry.addEventListener('click', () => window.location.reload())
  alert.append(message, retry)
  document.body.append(alert)
}
