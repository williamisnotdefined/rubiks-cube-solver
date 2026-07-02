const defaultBaseUrl = 'http://speedcube.com.br/api/wca-data/v1'

const config = parseArgs(process.argv.slice(2))
const baseUrl = stripTrailingSlash(config.baseUrl ?? process.env.WCA_DATA_SMOKE_BASE_URL ?? defaultBaseUrl)
const maxMs = Number(config.maxMs ?? process.env.WCA_DATA_SMOKE_MAX_MS ?? '5000')

const checks = [
  { kind: 'status', path: '/status' },
  { kind: 'list', path: '/events?pageSize=1' },
  { kind: 'list', path: '/countries?pageSize=1' },
  { kind: 'list', path: '/continents?pageSize=1' },
  { kind: 'list', path: '/formats?pageSize=1' },
  { kind: 'list', path: '/round-types?pageSize=1' },
  { kind: 'list', path: '/championship-eligible-countries?championshipType=greater_china&pageSize=1' },
  { kind: 'list', path: '/championships?pageSize=1' },
  { kind: 'list', path: '/competitions?pageSize=1&eventId=333' },
  { kind: 'list', path: '/persons?pageSize=1&search=park' },
  { kind: 'list', path: '/rankings?eventId=333&type=single&pageSize=1' },
  { kind: 'list', path: '/results?eventId=333&pageSize=1' },
  { kind: 'list', path: '/scrambles?eventId=333&pageSize=1' },
  { kind: 'openapi', path: '/openapi.json' },
  { kind: 'docs', path: '/docs' },
]

const failures = []
let datasetId = null

for (const check of checks) {
  const url = `${baseUrl}${check.path}`
  const startedAt = Date.now()

  try {
    const response = await fetch(url)
    const elapsedMs = Date.now() - startedAt
    const contentType = response.headers.get('content-type') ?? ''
    const body = await response.text()

    if (response.status !== 200) {
      throw new Error(`expected HTTP 200, got ${response.status}`)
    }

    if (Number.isFinite(maxMs) && elapsedMs > maxMs) {
      throw new Error(`expected <= ${maxMs}ms, got ${elapsedMs}ms`)
    }

    const summary = validateBody(check, body, contentType)

    if (summary.datasetId !== undefined) {
      if (datasetId === null) {
        datasetId = summary.datasetId
      } else if (summary.datasetId !== datasetId) {
        throw new Error(`dataset mismatch: expected ${datasetId}, got ${summary.datasetId}`)
      }
    }

    process.stdout.write(`ok ${elapsedMs}ms ${check.path} ${summaryText(summary)}\n`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    failures.push(`${check.path}: ${message}`)
    process.stdout.write(`fail ${check.path} ${message}\n`)
  }
}

if (failures.length > 0) {
  process.stderr.write(`WCA public smoke failed (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`WCA public smoke passed for ${baseUrl} (${datasetId ?? 'no dataset'})\n`)
}

function validateBody(check, body, contentType) {
  if (check.kind === 'docs') {
    if (!contentType.includes('text/html') || !body.includes('redoc.standalone.js')) {
      throw new Error('docs response is not Redoc HTML')
    }

    return { kind: 'docs' }
  }

  if (!contentType.includes('application/json')) {
    throw new Error(`expected JSON content-type, got ${contentType}`)
  }

  const json = JSON.parse(body)

  if (check.kind === 'status') {
    if (json.status !== 'ok') {
      throw new Error(`expected status ok, got ${json.status}`)
    }

    if (typeof json.activeDataset?.id !== 'string') {
      throw new Error('status response is missing activeDataset.id')
    }

    const totalRows = json.metrics?.activeDataset?.counts?.totalRows

    if (!Number.isInteger(totalRows) || totalRows <= 0) {
      throw new Error('status response is missing positive metrics.activeDataset.counts.totalRows')
    }

    return { datasetId: json.activeDataset.id, kind: 'status', totalRows }
  }

  if (check.kind === 'openapi') {
    if (json.openapi !== '3.0.3' || json.paths?.['/wca-data/v1/status'] === undefined) {
      throw new Error('OpenAPI response is missing expected status path')
    }

    return { kind: 'openapi' }
  }

  if (!Array.isArray(json.data)) {
    throw new Error('list response data is not an array')
  }

  if (json.data.length === 0) {
    throw new Error('list response data is empty')
  }

  if (!Number.isInteger(json.pagination?.total) || json.pagination.total < json.data.length) {
    throw new Error('list response pagination total is invalid')
  }

  if (typeof json.meta?.datasetId !== 'string') {
    throw new Error('list response is missing meta.datasetId')
  }

  return { count: json.data.length, datasetId: json.meta.datasetId, kind: 'list', total: json.pagination.total }
}

function summaryText(summary) {
  const parts = [summary.kind]

  if (summary.datasetId !== undefined) {
    parts.push(`dataset=${summary.datasetId}`)
  }

  if (summary.totalRows !== undefined) {
    parts.push(`totalRows=${summary.totalRows}`)
  }

  if (summary.total !== undefined) {
    parts.push(`total=${summary.total}`)
  }

  return parts.join(' ')
}

function stripTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function parseArgs(args) {
  const parsed = {}

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const [flag, inlineValue] = arg.split('=', 2)

    switch (flag) {
      case '--base-url':
        parsed.baseUrl = inlineValue ?? args[++index]
        break
      case '--max-ms':
        parsed.maxMs = inlineValue ?? args[++index]
        break
      case '--help':
      case '-h':
        process.stdout.write('Usage: npm run wca:smoke:public -- [--base-url <url>] [--max-ms <milliseconds>]\n')
        process.exit(0)
        break
      default:
        throw new Error(`Unknown option: ${arg}`)
    }
  }

  return parsed
}
