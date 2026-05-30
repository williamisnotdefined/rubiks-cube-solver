import net from 'node:net'

const [label = 'service', rawAddress = '127.0.0.1:3001'] = process.argv.slice(2)
const { host, port } = parseAddress(rawAddress)
const server = net.createServer()

server.once('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`${label} port ${host}:${port} is already in use.`)
    console.error('Stop the existing process or override the configured port before running the tunnel script.')
    process.exit(1)
  }

  console.error(`Could not check ${label} port ${host}:${port}: ${error.message}`)
  process.exit(1)
})

server.once('listening', () => {
  server.close(() => process.exit(0))
})

server.listen(port, host)

function parseAddress(rawAddress) {
  if (rawAddress.startsWith('http://') || rawAddress.startsWith('https://')) {
    const url = new URL(rawAddress)
    return {
      host: url.hostname || '127.0.0.1',
      port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
    }
  }

  const separatorIndex = rawAddress.lastIndexOf(':')
  if (separatorIndex === -1) {
    return { host: '127.0.0.1', port: Number(rawAddress) }
  }

  return {
    host: rawAddress.slice(0, separatorIndex) || '127.0.0.1',
    port: Number(rawAddress.slice(separatorIndex + 1)),
  }
}
