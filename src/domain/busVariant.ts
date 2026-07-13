import type { BusVariant, BusVariantFilter } from './types';

interface VariantInput {
  lineCode: string;
  description: string;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function classifyBusVariant(input: VariantInput): BusVariant {
  if (input.lineCode.trim() !== '8350') {
    return 'not-applicable';
  }

  return /\bdiret[ao]\b/.test(normalize(input.description)) ? 'direto' : 'nao-direto';
}

export function matchesVariantFilter(variant: BusVariant, filter: BusVariantFilter): boolean {
  if (variant === 'not-applicable') {
    return true;
  }

  if (filter === 'qualquer') {
    return true;
  }

  return variant === filter;
}
