// Production server: static files from dist/client, everything else through the TanStack Start handler.
// Build first (`bun run build`), then `bun run start`. Reads PORT (default 3000).
import { join, normalize } from 'node:path'
// @ts-expect-error -- produced by `bun run build`, has no type declarations
import built from './dist/server/server.js'

const handler = built as { fetch: (request: Request) => Response | Promise<Response> }

const CLIENT_DIR = join(import.meta.dir, 'dist/client')
const port = Number(process.env.PORT ?? 3000)

Bun.serve({
  port,
  idleTimeout: 120, // the finale (chronicle + painting) can take ~45 s
  async fetch(request) {
    const { pathname } = new URL(request.url)
    if (request.method === 'GET' && pathname !== '/' && !pathname.endsWith('/')) {
      const path = normalize(join(CLIENT_DIR, decodeURIComponent(pathname)))
      if (path.startsWith(CLIENT_DIR)) {
        const file = Bun.file(path)
        if (await file.exists()) {
          const immutable = pathname.startsWith('/assets/')
          return new Response(file, {
            headers: { 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600' },
          })
        }
      }
    }
    return handler.fetch(request)
  },
})

console.log(`Listening on http://localhost:${port}`)
