import { describe, expect, it } from 'vitest';
import { parseJsonp } from './jsonp';

describe('parseJsonp', () => {
  it('parses callback-wrapped JSON', () => {
    expect(parseJsonp('jsonpCallback({"sucesso":true})')).toEqual({ sucesso: true });
  });

  it('parses JSONP with whitespace', () => {
    expect(parseJsonp(' jsonpCallback ( {"linhas":[]} ); ')).toEqual({ linhas: [] });
  });

  it('rejects content without a callback wrapper', () => {
    expect(() => parseJsonp('{"sucesso":true}')).toThrow('Resposta JSONP inválida');
  });
});
