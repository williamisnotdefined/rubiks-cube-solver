export const publicWcaDataDocsUrl = 'https://speedcube.com.br/api/wca-data/v1/docs'

export function redirectToWcaDataDocs(location: Pick<Location, 'replace'> = window.location) {
  location.replace(publicWcaDataDocsUrl)
}
