// Lets Bun scripts import files with Vite's `?raw` suffix, so server modules run outside Vite.
import { plugin } from 'bun'

plugin({
  name: 'vite-raw',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => {
      const path = args.path.replace(/\?raw$/, '').replace(/^#\//, `${process.cwd()}/src/`)
      return { path: path.startsWith('/') ? path : new URL(path, `file://${args.importer}`).pathname, namespace: 'raw' }
    })
    build.onLoad({ filter: /.*/, namespace: 'raw' }, async (args) => ({
      contents: `export default ${JSON.stringify(await Bun.file(args.path).text())}`,
      loader: 'js',
    }))
  },
})
