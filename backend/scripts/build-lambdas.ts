import * as esbuild from 'esbuild';
import * as fs from 'node:fs/promises';

const handlers = ['health', 'profile', 'recommend', 'voice'];

async function build(): Promise<void> {
  for (const name of handlers) {
    const outdir = `dist/handlers/${name}`;
    await fs.mkdir(outdir, { recursive: true });
    await esbuild.build({
      entryPoints: [`src/handlers/${name}.ts`],
      bundle: true,
      platform: 'node',
      target: 'node22',
      outfile: `${outdir}/index.js`,
      format: 'cjs',
      minify: true,
      sourcemap: true,
      // Bundle all dependencies so SAM never has to copy node_modules.
      // This avoids the Windows deep-path issues we hit with the default
      // NodejsNpmEsbuildBuilder.
      external: [],
    });
    console.log(`Built ${name} -> ${outdir}/index.js`);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
