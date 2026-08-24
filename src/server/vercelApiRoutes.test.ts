import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const mobilibusCatchAll = resolve(process.cwd(), 'api/mobilibus/[...path].ts');

describe('entrypoints das Functions Vercel', () => {
  it('publica uma Function catch-all para as rotas Mobilibus', () => {
    expect(existsSync(mobilibusCatchAll)).toBe(true);
  });
});
