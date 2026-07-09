import { BadGatewayError } from './errors';

export function parseJsonp<T = unknown>(input: string): T {
  const trimmed = input.trim().replace(/;$/, '');
  const match = trimmed.match(/^[A-Za-z_$][\w$]*\s*\(([\s\S]*)\)$/);

  if (!match) {
    throw new BadGatewayError('Resposta JSONP inválida');
  }

  try {
    return JSON.parse(match[1]) as T;
  } catch (error) {
    throw new BadGatewayError('JSON interno da resposta JSONP é inválido', error);
  }
}
