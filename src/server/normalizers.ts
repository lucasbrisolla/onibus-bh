import { classifyBusVariant } from '../domain/busVariant.js';
import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types';

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

function readNumber(record: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readDepartureLabel(raw: string): string | null {
  const departureMatch = raw.match(/sa[ií]da:\s*(\d{1,2})[:hH](\d{2})/i);

  if (!departureMatch) {
    return null;
  }

  const departureHour = Number(departureMatch[1]);
  const departureMinute = Number(departureMatch[2]);

  if (departureHour > 23 || departureMinute > 59) {
    return null;
  }

  return `Saída ${String(departureHour).padStart(2, '0')}h${String(departureMinute).padStart(2, '0')}`;
}

function readMinutes(record: UnknownRecord): number {
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

    const numericMatch = raw.match(/^\s*(\d+)\s*$/);
    if (numericMatch) {
      return Number(numericMatch[1]);
    }
  }

  return Number.POSITIVE_INFINITY;
}

function readDeparture(record: UnknownRecord): string | null {
  const raw =
    record.tempo ?? record.tempoMinutos ?? record.previsaoMinutos ?? record.minutos ?? record.prev;

  if (typeof raw !== 'string') {
    return null;
  }

  return readDepartureLabel(raw);
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
    const vehicleId = readString(record, ['numVeicGestor', 'vehicleId'], '') || null;
    const color = readNumber(record, ['cor']);
    const accessibilityCode = readNumber(record, ['tpAcess']);
    const departureLabel = readDeparture(record);
    const minutes = departureLabel ? Number.POSITIVE_INFINITY : readMinutes(record);
    const timeKey = departureLabel ?? String(minutes);
    const id = `${lineCode}-${serviceId ?? index}-${timeKey}`;

    return {
      id,
      lineCode,
      description,
      destination,
      minutes,
      departureLabel,
      queryTime,
      serviceId,
      vehicleId,
      color,
      accessibilityCode,
      variant: classifyBusVariant({ lineCode, description }),
    };
  });
}

export function normalizeNearbyStops(payload: UnknownRecord): NearbyStop[] {
  const list = Array.isArray(payload.paradas) ? payload.paradas : [];

  return list.filter(isPlainRecord).flatMap(record => {
    const latitude = readNumber(record, ['y', 'lat', 'latitude']);
    const longitude = readNumber(record, ['x', 'lng', 'long', 'longitude']);

    if (latitude === null || longitude === null) {
      return [];
    }

    return [
      {
        code: readString(record, ['cod', 'code']),
        publicCode: readString(record, ['siu', 'publicCode']),
        latitude,
        longitude,
        description: readString(record, ['desc', 'description', 'end'], 'Parada sem descrição'),
        color: readNumber(record, ['cor']),
      },
    ];
  });
}

export function normalizeRoutePoints(payload: UnknownRecord): RoutePoint[] {
  const list = Array.isArray(payload.itinerarios) ? payload.itinerarios : [];

  return list.filter(isPlainRecord).flatMap(record => {
    const latitude = readNumber(record, ['coordY', 'y', 'lat', 'latitude']);
    const longitude = readNumber(record, ['coordX', 'x', 'lng', 'long', 'longitude']);

    if (latitude === null || longitude === null) {
      return [];
    }

    return [{ latitude, longitude }];
  });
}

export function normalizeVehicles(payload: UnknownRecord): Vehicle[] {
  const list = Array.isArray(payload.veiculos) ? payload.veiculos : [];

  return list.filter(isPlainRecord).flatMap(record => {
    const latitude = readNumber(record, ['lat', 'latitude']);
    const longitude = readNumber(record, ['long', 'lng', 'longitude']);
    const vehicleId = readString(record, ['numVeicGestor', 'vehicleId']);

    if (latitude === null || longitude === null || !vehicleId) {
      return [];
    }

    return [
      {
        latitude,
        longitude,
        color: readNumber(record, ['cor']),
        lineCode: readString(record, ['descricao', 'sgLin', 'lineCode']),
        vehicleId,
        bearing: readNumber(record, ['direcao', 'bearing']),
      },
    ];
  });
}
