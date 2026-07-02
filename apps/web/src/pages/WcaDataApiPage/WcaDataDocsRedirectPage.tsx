import { useEffect } from 'react'
import { redirectToWcaDataDocs } from './wcaDataDocsRedirect'

export function WcaDataDocsRedirectPage() {
  useEffect(() => {
    redirectToWcaDataDocs()
  }, [])

  return null
}
