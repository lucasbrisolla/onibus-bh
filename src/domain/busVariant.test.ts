import { describe, expect, it } from 'vitest';
import { classifyBusVariant, matchesVariantFilter } from './busVariant';

describe('classifyBusVariant', () => {
  it('classifies 8350 direto from description text', () => {
    expect(classifyBusVariant({ lineCode: '8350', description: '8350 Direto Centro' })).toBe('direto');
  });

  it('classifies 8350 direta from description text', () => {
    expect(classifyBusVariant({ lineCode: '8350', description: '8350 DIRETA ESTACAO BARREIRO' })).toBe('direto');
  });

  it('classifies 8350 without direto text as nao-direto', () => {
    expect(classifyBusVariant({ lineCode: '8350', description: '8350 Estação Barreiro' })).toBe('nao-direto');
  });

  it('does not assign a variant to other lines', () => {
    expect(classifyBusVariant({ lineCode: '8208', description: '8208 Santa Tereza' })).toBe('not-applicable');
  });
});

describe('matchesVariantFilter', () => {
  it('accepts any 8350 variant when filter is qualquer', () => {
    expect(matchesVariantFilter('direto', 'qualquer')).toBe(true);
    expect(matchesVariantFilter('nao-direto', 'qualquer')).toBe(true);
  });

  it('requires matching direct variant when filter is direto', () => {
    expect(matchesVariantFilter('direto', 'direto')).toBe(true);
    expect(matchesVariantFilter('nao-direto', 'direto')).toBe(false);
  });

  it('requires matching non-direct variant when filter is nao-direto', () => {
    expect(matchesVariantFilter('nao-direto', 'nao-direto')).toBe(true);
    expect(matchesVariantFilter('direto', 'nao-direto')).toBe(false);
  });
});
