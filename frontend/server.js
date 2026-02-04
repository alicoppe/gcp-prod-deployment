import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const port = Number(process.env.PORT || 8080)

const configPayload = () => ({
  VITE_API_URL: process.env.VITE_API_URL || '',
  VITE_ASSET_BUCKET: process.env.VITE_ASSET_BUCKET || '',
})

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, headers)
  res.end(body)
}

const safePath = (urlPath) => {
  const normalized = path.normalize(urlPath).replace(/^\.(\.|[\\/])+/, '')
  const fullPath = path.join(distDir, normalized)
  if (!fullPath.startsWith(distDir)) {
    return null
  }
  return fullPath
}

const serveFile = async (res, filePath, cacheControl) => {
  const ext = path.extname(filePath)
  const type = mimeTypes[ext] || 'application/octet-stream'
  const data = await readFile(filePath)
  send(res, 200, data, {
    'Content-Type': type,
    'Cache-Control': cacheControl,
  })
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    send(res, 400, 'Bad Request')
    return
  }

  const urlPath = decodeURIComponent(req.url.split('?')[0])

  if (urlPath === '/config.js') {
    const payload = `window.__APP_CONFIG__ = ${JSON.stringify(configPayload())};`
    send(res, 200, payload, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    return
  }

  const targetPath = urlPath === '/' ? '/index.html' : urlPath
  const resolved = safePath(targetPath)
  if (!resolved) {
    send(res, 400, 'Bad Request')
    return
  }

  try {
    const stats = await stat(resolved)
    if (stats.isFile()) {
      const cacheControl = urlPath.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache'
      await serveFile(res, resolved, cacheControl)
      return
    }
  } catch {
    // fall through to SPA handler
  }

  try {
    await serveFile(res, path.join(distDir, 'index.html'), 'no-cache')
  } catch {
    send(res, 404, 'Not Found')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend server listening on ${port}`)
})
