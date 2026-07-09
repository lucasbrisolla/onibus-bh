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
});
