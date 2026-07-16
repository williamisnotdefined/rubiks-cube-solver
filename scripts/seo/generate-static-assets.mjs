import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const webRoot = resolve(repoRoot, 'apps', 'web')
const distDir = resolve(webRoot, 'dist')
const ssrDir = resolve(webRoot, 'dist-ssr')
const siteOrigin = 'https://speedcube.com.br'
const defaultLocale = 'en-US'
const siteName = 'Speedcube'
const defaultOgImageUrl = `${siteOrigin}/og-default.svg`
const jsonLdScriptNonce = 'speedcube-jsonld'
const baseHtml = await readFile(resolve(distDir, 'index.html'), 'utf8')
const { render, staticPaths, staticRouteGroups } = await import(pathToFileURL(resolve(ssrDir, 'ssg.js')).href)

for (const routePath of staticPaths) {
  const rendered = await render(routePath)
  const outputDir = resolve(distDir, routePath.slice(1))

  await mkdir(outputDir, { recursive: true })
  await writeFile(resolve(outputDir, 'index.html'), prerenderHtml(baseHtml, rendered))
}

const notFoundHtml = neutralNotFoundHtml(baseHtml)
await Promise.all([
  writeFile(resolve(distDir, '404.html'), notFoundHtml),
  writeFile(resolve(distDir, 'sitemap.xml'), sitemap(staticRouteGroups)),
  writeFile(resolve(distDir, 'routing-manifest.json'), `${JSON.stringify({ redirects: { '/': '/solve/', '/api/wca-data': '/api/wca-data/v1/docs', '/api/wca-data/': '/api/wca-data/v1/docs', '/notations': '/notations/3x3/', '/notations/': '/notations/3x3/' }, routableStaticPaths: staticPaths }, null, 2)}\n`),
])
await rm(ssrDir, { force: true, recursive: true })

function neutralNotFoundHtml(html) {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>Page not found | ${siteName}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, '<meta name="description" content="This Speedcube page could not be found." />')
    .replace('</head>', '    <meta name="robots" content="noindex,nofollow" />\n  </head>')
}

function prerenderHtml(html, { appHtml, jsonLd, metadata }) {
  const alternates = metadata.noindex
    ? {}
    : staticRouteGroups
      .find((route) => route.path === metadata.path)
      ?.alternates ?? {}
  const alternateTags = Object.entries(alternates)
    .map(([locale, path]) => `<link rel="alternate" hreflang="${locale}" href="${siteOrigin}${path}" />`)
  const headTags = [
    `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" />`,
    ...alternateTags,
    ...(metadata.noindex ? [] : [`<link rel="alternate" hreflang="x-default" href="${siteOrigin}${alternates[defaultLocale]}" />`]),
    `<meta name="robots" content="${metadata.noindex ? 'noindex,nofollow' : 'index,follow'}" />`,
    `<meta property="og:site_name" content="${siteName}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}" />`,
    `<meta property="og:image" content="${defaultOgImageUrl}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="twitter:image" content="${defaultOgImageUrl}" />`,
    ...jsonLd.map((value) => `<script type="application/ld+json" nonce="${jsonLdScriptNonce}">${escapeScript(JSON.stringify(value))}</script>`),
  ].join('\n    ')

  return html
    .replace(/<html lang="[^"]*">/, `<html lang="${metadata.htmlLang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(metadata.description)}" />`)
    .replace('</head>', `    ${headTags}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root" data-ssg="true">${appHtml}</div>`)
}

function sitemap(routeGroups) {
  const entries = routeGroups.flatMap((route) => Object.entries(route.alternates).map(([locale, path]) => {
    const links = Object.entries(route.alternates)
      .map(([alternateLocale, alternatePath]) => `    <xhtml:link rel="alternate" hreflang="${alternateLocale}" href="${siteOrigin}${alternatePath}" />`)
    links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${siteOrigin}${route.alternates[defaultLocale]}" />`)

    return `  <url>\n    <loc>${siteOrigin}${path}</loc>\n${links.join('\n')}\n  </url>`
  }))

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeScript(value) {
  return value.replaceAll('</script', '<\\/script')
}
