import { classifyBusVariant } from '../domain/busVariant';
import type { Prediction } from '../domain/types';

type UnknownRecord = Record<string, unknown>;

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

function readMinutes(record: UnknownRecord): number {
  const raw = record.tempo ?? record.tempoMinutos ?? record.previsaoMinutos ?? record.minutos;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }

  if (typeof raw === 'string') {
    const match = raw.match(/\d+/);
    if (match) {
      return Number(match[0]);
    }
  }

  return Number.POSITIVE_INFINITY;
}

export function normalizePredictions(payload: UnknownRecord): Prediction[] {
  const list = Array.isArray(payload.previsoes) ? payload.previsoes : [];
  const queryTime = typeof payload.horaConsulta === 'string' ? payload.horaConsulta : null;

  return list.map((item, index) => {
    const record = item as UnknownRecord;
    const lineCode = readString(record, ['codLinha', 'linha', 'sgl', 'codigoLinha']);
    const description = readString(record, ['descLinha', 'descricao', 'nomLinha', 'linha'], lineCode);
    const destination = readString(
      record,
      ['destino', 'descricaoDestino', 'sentido'],
      'Destino não informado',
    );
    const serviceId = readString(record, ['codItinerario', 'idItinerario', 'servico'], '') || null;
    const minutes = readMinutes(record);
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
