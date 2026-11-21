const localePrefixPattern = /^\/(?:de|en|es|fr|it|ja|pt-BR|ru|zh)(?=\/|$)/

export function stripLocalePath(pathname: string): string {
  const normalized =
    pathname.length === 0 ? '/' : pathname.startsWith('/') ? pathname : `/${pathname}`
  const stripped = normalized.replace(localePrefixPattern, '')

  return stripped.length === 0 ? '/' : stripped
}
