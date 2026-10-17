import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionSourceExtensions = new Set(['.ts', '.vue']);
const thirdPartyImportantExceptions = new Map([
  ['src/components/MapView.vue', 'Utilitários aplicados em controles e marcadores criados pelo Leaflet.'],
  ['src/components/MobilibusMap.vue', 'Utilitários aplicados em controles e marcadores criados pelo Leaflet.'],
  ['src/components/mapMarkerStyles.ts', 'Marcadores e tooltips HTML criados pelo Leaflet fora da árvore Vue.'],
  ['src/components/mapBaseLayer.ts', 'Filtros e créditos da camada de tiles do Leaflet.'],
  ['src/components/mapLifecycle.ts', 'Controles de mapa gerados pelo Leaflet.'],
]);
const previewException = 'src/components/MapStylePreview.vue';
const hexPattern = /#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})(?![\da-z_-])/gi;

function collectHexColors(source) {
  return new Set([...source.matchAll(hexPattern)].map(match => match[0].toLowerCase()));
}

function walk(directory) {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) return walk(relative);
    return [relative];
  });
}

const designDocument = readFileSync(path.join(root, 'DESIGN.md'), 'utf8');
const tokenFile = readFileSync(path.join(root, 'src/style.css'), 'utf8');
const documentedColors = new Set([
  ...collectHexColors(designDocument),
  ...collectHexColors(tokenFile),
]);
const sourceFiles = walk('src').filter(file => {
  const extension = path.extname(file);
  return productionSourceExtensions.has(extension) && !file.endsWith('.test.ts');
});
const publicFiles = walk('public').filter(file => /\.(?:svg|webmanifest|html|css)$/i.test(file));
const inspectedFiles = [...sourceFiles, 'index.html', ...publicFiles];
const violations = [];

for (const relativeFile of inspectedFiles) {
  const source = readFileSync(path.join(root, relativeFile), 'utf8');
  if (relativeFile !== previewException) {
    for (const match of source.matchAll(hexPattern)) {
      const color = match[0].toLowerCase();
      if (documentedColors.has(color)) continue;
      const line = source.slice(0, match.index).split('\n').length;
      violations.push(`${relativeFile}:${line} usa ${match[0]} sem token em src/style.css ou registro em DESIGN.md`);
    }
  }

  if (!productionSourceExtensions.has(path.extname(relativeFile)) || relativeFile.endsWith('.test.ts')) {
    continue;
  }
  for (const match of source.matchAll(/tw:[^\s"'`]+!/g)) {
    if (thirdPartyImportantExceptions.has(relativeFile)) continue;
    const line = source.slice(0, match.index).split('\n').length;
    violations.push(`${relativeFile}:${line} usa ${match[0]}; remova ! ou justifique uma exceção Leaflet`);
  }
}

if (violations.length > 0) {
  console.error('Verificação do sistema de design reprovada:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Sistema de design verificado: cores registradas e sem novos utilitários ! fora das exceções Leaflet.');
}
