import { describe, expect, it, vi } from 'vitest';

import type {
  ApiContractOperations,
  ApiContractResponse,
} from './apiContractDispatcher';
import { dispatchApiRequest } from './apiContractDispatcher';
import { createSiuOperations, type SiuJsonpTransport } from './siuOperations';

function createTransport(payload: unknown): {
  transport: SiuJsonpTransport;
  requestJsonp: ReturnType<typeof vi.fn>;
} {
  const requestJsonp = vi.fn(async () => payload);

  return {
    transport: { requestJsonp },
    requestJsonp,
  };
}

function withMobilibusOperations(siuOperations: ReturnType<typeof createSiuOperations>): ApiContractOperations {
  return {
    ...siuOperations,
    searchMobilibusLines: async () => [],
    getMobilibusTimetable: async () => ({
      projectId: 501,
      routeId: 1,
      directions: [],
    }),
    getMobilibusStops: async () => [],
    getMobilibusDepartures: async () => ({
      projectId: 501,
      stopId: 1,
      stopName: '',
      referenceTime: null,
      departures: [],
    }),
  };
}

describe('createSiuOperations', () => {
  it('constrói o path de previsões com o cod interno e escolhe o normalizador', async () => {
    const { transport, requestJsonp } = createTransport({
      horaConsulta: '10:00',
      previsoes: [
        {
          sgLin: '8350',
          prev: '5 Minutos',
          apelidoLinha: '8350 Direto Centro',
          destino: 'Centro',
          codItinerario: 53564,
        },
      ],
    });
    const operations = createSiuOperations(transport);

    await expect(operations.getStopPredictions('13566/aux')).resolves.toMatchObject([
      { lineCode: '8350', minutes: 5, serviceId: '53564', variant: 'direto' },
    ]);
    expect(requestJsonp).toHaveBeenCalledWith(
      '/V3/buscarPrevisoes/13566%2Faux/false/0/BHZ/retornoJSON',
    );
  });

  it('preserva a ordem longitude/latitude e o siu público ao consultar paradas próximas', async () => {
    const { transport, requestJsonp } = createTransport({
      paradas: [
        {
          cod: 13566,
          siu: '40134',
          x: -43.99563,
          y: -19.916136,
          desc: 'ROD ANEL',
        },
      ],
    });
    const operations = createSiuOperations(transport);

    await expect(operations.getNearbyStops(-19.916136, -43.99563)).resolves.toEqual([
      {
        code: '13566',
        publicCode: '40134',
        latitude: -19.916136,
        longitude: -43.99563,
        description: 'ROD ANEL',
        color: null,
      },
    ]);
    expect(requestJsonp).toHaveBeenCalledWith(
      '/V3/buscarParadasProximas/-43.99563/-19.916136/0/BHZ/retornoJSONH',
    );
  });

  it('constrói paths de itinerário, veículos, linhas e saúde com seus contratos', async () => {
    const { transport, requestJsonp } = createTransport({
      itinerarios: [{ coordX: -43.9, coordY: -19.9 }],
      veiculos: [
        {
          lat: -19.91,
          long: -43.99,
          numVeicGestor: '40743',
          descricao: '8350',
        },
      ],
    });
    const operations = createSiuOperations(transport);

    await operations.getRoutePoints('53564/aux');
    await operations.getVehicles('53564/aux');
    await operations.getLines();
    await operations.checkSiuHealth();

    expect(requestJsonp.mock.calls).toEqual([
      ['/V3/buscarItinerario/53564%2Faux/0/BHZ/retornoJSONItinerario'],
      ['/V3/retornaVeiculosMapa/53564%2Faux/0/BHZ/retornoJSONVeiculos'],
      ['/buscarLinhas/jsonpCallback'],
      ['/buscarLinhas/jsonpCallback', { timeoutMs: 5000 }],
    ]);
  });

  it('permite ao dispatcher executar uma operação SIU com transporte fake', async () => {
    const { transport, requestJsonp } = createTransport({
      paradas: [{ cod: 13566, siu: '40134', x: -43.99563, y: -19.916136, desc: 'ROD ANEL' }],
    });
    const operations = withMobilibusOperations(createSiuOperations(transport));
    const response = (await dispatchApiRequest(
      {
        method: 'GET',
        url: '/api/paradas/proximas?lat=-19.916136&lng=-43.99563',
      },
      operations,
    )) as ApiContractResponse;

    expect(response).toEqual({
      status: 200,
      body: {
        stops: [
          {
            code: '13566',
            publicCode: '40134',
            latitude: -19.916136,
            longitude: -43.99563,
            description: 'ROD ANEL',
            color: null,
          },
        ],
      },
    });
    expect(requestJsonp).toHaveBeenCalledOnce();
  });
});
