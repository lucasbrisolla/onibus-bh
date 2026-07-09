import { describe, expect, it } from 'vitest';
import { normalizePredictions } from './normalizers';

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
        queryTime: '10:00',
        serviceId: 'abc',
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

  it('calculates minutes from same-day departure time', () => {
    const result = normalizePredictions({
      horaConsulta: '20:10',
      previsoes: [{ linha: '8208', tempo: 'SAÍDA: 20:30' }],
    });

    expect(result[0]?.minutes).toBe(20);
  });

  it('calculates minutes from next-day departure time', () => {
    const result = normalizePredictions({
      horaConsulta: '23:50',
      previsoes: [{ linha: '8208', tempo: 'SAÍDA: 00:10' }],
    });

    expect(result[0]?.minutes).toBe(20);
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
