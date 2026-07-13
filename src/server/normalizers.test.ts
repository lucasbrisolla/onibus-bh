import { describe, expect, it } from 'vitest';
import {
  normalizeNearbyStops,
  normalizePredictions,
  normalizeRoutePoints,
  normalizeVehicles,
} from './normalizers';

describe('normalizePredictions', () => {
  it('normalizes SIU predictions and marks 8350 direto', () => {
    const result = normalizePredictions({
      horaConsulta: '10:00',
      previsoes: [
        {
          codLinha: '8350',
          descLinha: '8350 Direto Centro',
          destino: 'Centro',
          tempo: '5 min',
          codItinerario: 'abc',
        },
      ],
    });

    expect(result).toEqual([
      {
        id: '8350-abc-5',
        lineCode: '8350',
        description: '8350 Direto Centro',
        destination: 'Centro',
        minutes: 5,
        departureLabel: null,
        queryTime: '10:00',
        serviceId: 'abc',
        vehicleId: null,
        color: null,
        accessibilityCode: null,
        variant: 'direto',
      },
    ]);
  });

  it('normalizes minutes from numeric fields', () => {
    const result = normalizePredictions({
      horaConsulta: null,
      previsoes: [{ linha: '8208', descricao: '8208', destino: 'Centro', tempo: 3 }],
    });

    expect(result[0]?.minutes).toBe(3);
    expect(result[0]?.variant).toBe('not-applicable');
  });

  it('normalizes real SIU prediction fields', () => {
    const result = normalizePredictions({
      horaConsulta: '20:10',
      previsoes: [
        {
          sgLin: '808',
          prev: '2 Minutos',
          apelidoLinha: 'EST. SÃO GABRIEL/PAULO VI',
          codItinerario: 57930,
        },
      ],
    });

    expect(result[0]).toMatchObject({
      lineCode: '808',
      minutes: 2,
      description: 'EST. SÃO GABRIEL/PAULO VI',
      destination: 'EST. SÃO GABRIEL/PAULO VI',
      serviceId: '57930',
    });
  });

  it('enriches predictions with vehicle, color, and accessibility fields', () => {
    const result = normalizePredictions({
      horaConsulta: '10/07/2026 17:21:49',
      previsoes: [
        {
          sgLin: '8350',
          prev: '16 Minutos',
          tpAcess: 6,
          cor: 3,
          numVeicGestor: '40743',
          apelidoLinha: 'EST.SAO GABRIEL/EST.BARREIRO',
          codItinerario: 53564,
        },
      ],
    });

    expect(result[0]).toMatchObject({
      lineCode: '8350',
      minutes: 16,
      serviceId: '53564',
      vehicleId: '40743',
      color: 3,
      accessibilityCode: 6,
    });
  });

  it('calculates minutes from same-day departure time', () => {
    const result = normalizePredictions({
      horaConsulta: '20:10',
      previsoes: [{ linha: '8208', tempo: 'SAÍDA: 20:30' }],
    });

    expect(result[0]?.minutes).toBe(Number.POSITIVE_INFINITY);
    expect(result[0]?.departureLabel).toBe('Saída 20h30');
  });

  it('calculates minutes from departure time when query time includes date and seconds', () => {
    const result = normalizePredictions({
      horaConsulta: '12/07/2026 09:01:24',
      previsoes: [{ linha: '8208', tempo: 'SAÍDA: 09:19' }],
    });

    expect(result[0]?.minutes).toBe(Number.POSITIVE_INFINITY);
    expect(result[0]?.departureLabel).toBe('Saída 09h19');
  });

  it('calculates minutes from next-day departure time', () => {
    const result = normalizePredictions({
      horaConsulta: '23:50',
      previsoes: [{ linha: '8208', tempo: 'SAÍDA: 00:10' }],
    });

    expect(result[0]?.minutes).toBe(Number.POSITIVE_INFINITY);
    expect(result[0]?.departureLabel).toBe('Saída 00h10');
  });

  it('normalizes departure labels written with h', () => {
    const result = normalizePredictions({
      horaConsulta: '12/07/2026 12:10:00',
      previsoes: [{ linha: '8208', tempo: 'SAÍDA: 12H45' }],
    });

    expect(result[0]?.departureLabel).toBe('Saída 12h45');
    expect(result[0]?.minutes).toBe(Number.POSITIVE_INFINITY);
  });

  it('uses departure labels to keep same-line scheduled predictions selectable independently', () => {
    const result = normalizePredictions({
      horaConsulta: '12/07/2026 18:30:00',
      previsoes: [
        { linha: '1145', codItinerario: 'centro', tempo: 'SAÍDA: 19:45' },
        { linha: '1145', codItinerario: 'centro', tempo: 'SAÍDA: 20:15' },
      ],
    });

    expect(result[0]?.id).not.toBe(result[1]?.id);
    expect(result.map(prediction => prediction.departureLabel)).toEqual([
      'Saída 19h45',
      'Saída 20h15',
    ]);
  });

  it('ignores invalid prediction items without crashing', () => {
    const result = normalizePredictions({
      horaConsulta: '20:10',
      previsoes: [
        null,
        ['invalid'],
        'invalid',
        1,
        { linha: '8208', descricao: '8208', destino: 'Centro', tempo: '3 min.' },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.minutes).toBe(3);
  });
});

describe('normalizeNearbyStops', () => {
  it('normalizes nearby stops from SIU coordinates', () => {
    const result = normalizeNearbyStops({
      sucesso: true,
      paradas: [
        {
          cod: 13566,
          siu: '40134',
          x: -43.99563,
          y: -19.916136,
          desc: 'ROD ANEL',
          cor: 4,
        },
      ],
    });

    expect(result).toEqual([
      {
        code: '13566',
        publicCode: '40134',
        latitude: -19.916136,
        longitude: -43.99563,
        description: 'ROD ANEL',
        color: 4,
      },
    ]);
  });

  it('skips nearby stops without valid coordinates', () => {
    const result = normalizeNearbyStops({
      paradas: [
        { cod: 1, siu: '1', x: -43.9, y: -19.9, desc: 'Valida' },
        { cod: 2, siu: '2', x: null, y: -19.8, desc: 'Invalida' },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBe('Valida');
  });
});

describe('normalizeRoutePoints', () => {
  it('normalizes route points and skips invalid coordinates', () => {
    const result = normalizeRoutePoints({
      itinerarios: [
        { coordX: -43.9, coordY: -19.9 },
        { coordX: null, coordY: -19.8 },
      ],
    });

    expect(result).toEqual([{ latitude: -19.9, longitude: -43.9 }]);
  });
});

describe('normalizeVehicles', () => {
  it('normalizes live vehicles with optional bearing', () => {
    const result = normalizeVehicles({
      veiculos: [
        {
          lat: -19.91,
          long: -43.99,
          cor: 3,
          descricao: '8350',
          numVeicGestor: '40743',
          direcao: 135,
        },
      ],
    });

    expect(result).toEqual([
      {
        latitude: -19.91,
        longitude: -43.99,
        color: 3,
        lineCode: '8350',
        vehicleId: '40743',
        bearing: 135,
      },
    ]);
  });
});
