import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const mobilibusRoutes = [
  'api/mobilibus/linhas.ts',
  'api/mobilibus/projetos/[projectId]/linhas/[routeId]/horarios.ts',
  'api/mobilibus/projetos/[projectId]/pontos.ts',
  'api/mobilibus/projetos/[projectId]/pontos/[stopId]/partidas.ts',
].map(route => resolve(process.cwd(), route));

describe('entrypoints das Functions Vercel', () => {
  it('publica uma Function para cada rota Mobilibus', () => {
    expect(mobilibusRoutes.filter(route => !existsSync(route))).toEqual([]);
  });
});
