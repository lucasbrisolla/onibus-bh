import { classifyBusVariant } from '../domain/busVariant';
import type { Prediction } from '../domain/types';

type UnknownRecord = Record<string, unknown>;

function isPlainRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: UnknownRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return fallback;
}

function minutesFromDeparture(raw: string, queryTime: string | null): number {
  if (!queryTime) {
    return Number.POSITIVE_INFINITY;
  }

  const departureMatch = raw.match(/sa[ií]da:\s*(\d{1,2}):(\d{2})/i);
  const queryMatch = queryTime.match(/^(\d{1,2}):(\d{2})$/);

  if (!departureMatch || !queryMatch) {
    return Number.POSITIVE_INFINITY;
  }

  const departureHour = Number(departureMatch[1]);
  const departureMinute = Number(departureMatch[2]);
  const queryHour = Number(queryMatch[1]);
  const queryMinute = Number(queryMatch[2]);

  if (
    departureHour > 23 ||
    departureMinute > 59 ||
    queryHour > 23 ||
    queryMinute > 59
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const departureTotal = departureHour * 60 + departureMinute;
  const queryTotal = queryHour * 60 + queryMinute;
  const diff = departureTotal - queryTotal;

  return diff >= 0 ? diff : diff + 24 * 60;
}

function readMinutes(record: UnknownRecord, queryTime: string | null): number {
  const raw =
    record.tempo ?? record.tempoMinutos ?? record.previsaoMinutos ?? record.minutos ?? record.prev;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }

  if (typeof raw === 'string') {
    const relativeMatch = raw.match(/^\s*(\d+)\s*(?:min(?:uto)?s?)\.?\s*$/i);
    if (relativeMatch) {
      return Number(relativeMatch[1]);
    }

    if (/sa[ií]da:/i.test(raw)) {
      return minutesFromDeparture(raw, queryTime);
    }

    const numericMatch = raw.match(/^\s*(\d+)\s*$/);
    if (numericMatch) {
      return Number(numericMatch[1]);
    }
  }

  return Number.POSITIVE_INFINITY;
}

export function normalizePredictions(payload: UnknownRecord): Prediction[] {
  const list = Array.isArray(payload.previsoes) ? payload.previsoes : [];
  const queryTime = typeof payload.horaConsulta === 'string' ? payload.horaConsulta : null;

  return list.filter(isPlainRecord).map((record, index) => {
    const lineCode = readString(record, ['codLinha', 'linha', 'sgl', 'codigoLinha', 'sgLin']);
    const description = readString(
      record,
      ['descLinha', 'descricao', 'nomLinha', 'linha', 'apelidoLinha'],
      lineCode,
    );
    const destination = readString(
      record,
      ['destino', 'descricaoDestino', 'sentido', 'apelidoLinha'],
      'Destino não informado',
    );
    const serviceId = readString(record, ['codItinerario', 'idItinerario', 'servico'], '') || null;
    const minutes = readMinutes(record, queryTime);
    const id = `${lineCode}-${serviceId ?? index}-${minutes}`;

    return {
      id,
      lineCode,
      description,
      destination,
      minutes,
      queryTime,
      serviceId,
      variant: classifyBusVariant({ lineCode, description }),
    };
  });
}
