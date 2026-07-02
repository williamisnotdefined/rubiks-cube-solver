import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Controller, Get, Inject, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { parse } from 'yaml'
import type { WcaDataEnv } from '../../config/env.schema.js'
import { WCA_DATA_ENV } from '../tokens.js'

const openApiSpecPath = join(process.cwd(), 'openapi', 'wca-data-v1.yaml')

@Controller('api/wca-data/v1')
export class OpenApiController {
  constructor(@Inject(WCA_DATA_ENV) private readonly env: WcaDataEnv) {}

  @Get('openapi.yaml')
  async getOpenApiYaml(@Res({ passthrough: true }) reply: FastifyReply): Promise<string> {
    reply
      .header('cache-control', 'public, max-age=300')
      .type('application/yaml; charset=utf-8')

    return readOpenApiSpec()
  }

  @Get('openapi.json')
  async getOpenApiJson(@Res({ passthrough: true }) reply: FastifyReply): Promise<unknown> {
    reply
      .header('cache-control', 'public, max-age=300')
      .type('application/json; charset=utf-8')

    return parse(await readOpenApiSpec())
  }

  @Get('docs')
  getDocs(@Res({ passthrough: true }) reply: FastifyReply): string {
    reply
      .header('cache-control', 'public, max-age=300')
      .type('text/html; charset=utf-8')

    return apiDocsHtml(this.env.WCA_DATA_PUBLIC_BASE_URL)
  }
}

async function readOpenApiSpec(): Promise<string> {
  return readFile(openApiSpecPath, 'utf8')
}

function apiDocsHtml(publicBaseUrl: string): string {
  const apiBaseUrl = publicBaseUrl.replace(/\/$/, '')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>WCA Data API Reference</title>
    <meta name="description" content="Unofficial WCA Data API reference for competitions, persons, rankings, and results.">
    <meta property="og:title" content="WCA Data API Reference">
    <meta property="og:description" content="Unofficial WCA Data API reference for public WCA Results Export data.">
    <meta property="og:url" content="${apiBaseUrl}/wca-data/v1/docs">
    <style>
      body { margin: 0; }
      redoc { display: block; min-height: 100vh; }
    </style>
  </head>
  <body>
    <redoc></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
    <script>
      Redoc.init('./openapi.yaml', {
        expandResponses: '200,400,404,503',
        hideDownloadButton: false,
        hideLoading: true,
        hideSingleRequestSampleTab: true,
        nativeScrollbars: false,
        pathInMiddlePanel: false,
        requiredPropsFirst: true,
        sideNavStyle: 'summary-only',
        sortPropsAlphabetically: false,
        theme: {
          colors: {
            primary: { main: '#0f172a' },
            success: { main: '#047857' },
            warning: { main: '#b45309' },
          },
          typography: {
            fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: '800' },
          },
          sidebar: { backgroundColor: '#f8fafc', textColor: '#334155' },
        },
      }, document.querySelector('redoc'))
    </script>
  </body>
</html>`
}
