import type { Plugin } from 'vite'

export function cubingWorkerSafeImports(): Plugin {
  return {
    generateBundle: {
      handler(_options, bundle) {
        for (const output of Object.values(bundle)) {
          if (
            output.type !== 'chunk' ||
            (!output.fileName.includes('search-worker-entry-') &&
              !output.fileName.includes('/inside-'))
          ) {
            continue
          }

          removeBrowserPreload(output)
        }
      },
      order: 'post',
    },
    name: 'cubing-worker-safe-imports',
  }
}

function removeBrowserPreload(output: { code: string; fileName: string }) {
  const helperImport = output.code.match(
    /import\{([^}]+)\}from"(\.\/preload-helper-[^"]+\.js)";/,
  )
  if (helperImport === null) {
    return
  }

  const specifiers = helperImport[1].split(',')
  const helperSpecifier = specifiers.find((specifier) => {
    const localName = importedLocalName(specifier)
    return new RegExp(`\\b${localName}\\(\\(\\)=>import\\(`).test(output.code)
  })
  if (helperSpecifier === undefined) {
    return
  }

  const helperName = importedLocalName(helperSpecifier)
  const preloadCall = new RegExp(
    `${helperName}\\(\\(\\)=>import\\(([^)]+)\\),(?:__vite__mapDeps\\(\\[[^\\]]*\\]\\)|\\[[^\\]]*\\])(?:,import\\.meta\\.url)?\\)`,
    'g',
  )
  output.code = output.code.replace(preloadCall, 'import($1)')

  const remainingSpecifiers = specifiers.filter((specifier) => specifier !== helperSpecifier)
  const replacement =
    remainingSpecifiers.length === 0
      ? ''
      : `import{${remainingSpecifiers.join(',')}}from"${helperImport[2]}";`
  output.code = output.code.replace(helperImport[0], replacement)

  if (!output.code.includes('__vite__mapDeps(')) {
    output.code = output.code.replace(/const __vite__mapDeps=.*?;\n?/, '')
  }
  if (
    new RegExp(`\\b${helperName}\\(\\(\\)=>import\\(`).test(output.code) ||
    output.code.includes('__vite__mapDeps(')
  ) {
    throw new Error(`worker chunk still contains browser-only preload code: ${output.fileName}`)
  }
}

function importedLocalName(specifier: string): string {
  return specifier.split(' as ').at(-1) ?? specifier
}
