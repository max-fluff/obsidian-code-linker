import esbuild from 'esbuild';
import { existsSync, copyFileSync } from 'fs';

const banner = '/* Code Linker — bundled from src/ by esbuild. Do not edit directly; edit src/ and run "npm run build". */';

await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'es2018',
  outfile: 'main.js',
  banner: { js: banner },
  external: ['obsidian', 'electron', 'fs', 'path'],
  logLevel: 'info',
}).catch((e) => { console.error(e); process.exit(1); });

let deployTargets = [];
try { ({ deployTargets = [] } = await import('./esbuild.local.mjs')); } catch { /* no local config */ }
for (const dir of deployTargets) {
  if (!existsSync(dir)) continue;
  for (const f of ['main.js', 'manifest.json', 'styles.css']) copyFileSync(f, `${dir}/${f}`);
  console.log(`Deployed to ${dir}`);
}
