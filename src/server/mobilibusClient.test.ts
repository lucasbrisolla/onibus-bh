import { describe, expect, it, vi } from 'vitest';

import { BadGatewayError, BadRequestError, GatewayTimeoutError, NotFoundError } from './errors';
import {
  createMobilibusClient,
  type MobilibusHttpResponse,
  type MobilibusHttpTransport,
} from './mobilibusClient';

const ROUTES_PATH = 'https://ss7u5urlxs.singularcdn.net.br/api/routes?project_id=501';
const TIMETABLE_PATH =
  'https://ss7u5urlxs.singularcdn.net.br/api/timetable?project_id=501&route_id=572385';
const STOPS_PATH =
  'https://ss7u5urlxs.singularcdn.net.br/api/stops?project_id=501&tile=6192,9117,16';
const DEPARTURES_PATH =
  'https://ss7u5urlxs.singularcdn.net.br/api/departures?stop_id=15192689&project_id=501';

function jsonResponse(body: unknown, status = 200): MobilibusHttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function routesPayload() {
  return [
    {
      routeId: 572385,
      agencyId: 39568,
      shortName: '2890',
      longName: 'Morada Nova / Pindorama / Cidade Industrial',
      price: 8.45,
    },
    {
      routeId: 572386,
      agencyId: 39568,
      shortName: '405R',
      longName: 'São João / Terminal Metropolitano',
    },
  ];
}

function timetablePayload() {
  return [
    {
      routeId: 572385,
      timetable: {
        directions: [
          {
            directionId: 0,
            desc: 'Ida',
            services: [
              {
                serviceId: 1,
                desc: 'Dias Úteis',
                days: [false, true, true, true, true, true, false],
                departures: [{ dep: '06:30' }, { dep: '05:15' }],
              },
              {
                serviceId: 2,
                desc: 'Sábados',
                departures: [{ dep: '07:10' }],
              },
            ],
          },
          {
            directionId: 1,
            desc: 'Volta',
            services: [
              {
                serviceId: 3,
                desc: 'Domingos',
                departures: [{ dep: '08:20' }, { dep: '09:40' }],
              },
            ],
          },
        ],
      },
    },
  ];
}

function stopsPayload() {
  return [
    {
      stopId: 15192689,
      projectId: 501,
      lat: -19.93193292,
      lng: -43.93043518,
      bearing: 340,
      name: 'Av. Afonso Pena, 2323 - Parada DEOESP',
      code: null,
      address: 'Avenida Afonso Pena 2328',
      type: 3,
      routeTypes: [3],
    },
    {
      stopId: 15192690,
      lat: '-19.932',
      lng: '-43.931',
      name: 'Praça Sete',
      code: 'P-02',
      address: '',
      bearing: null,
    },
  ];
}

function departuresPayload() {
  return {
    stopName: 'Av. Afonso Pena, 2323 - Parada DEOESP',
    time: 1787529945917,
    tzOffset: -3,
    trips: [
      {
        tripId: 2721729,
        headsign: 'Belo Horizonte',
        directionId: 0,
        routeId: 572156,
        shortName: '3838',
        longName: 'Rio Acima / Belo Horizonte',
        color: '#ef7d01',
        departures: [
          {
            time: '21:22:09',
            nextDay: false,
            vehicleId: '25H74',
            positionAge: 91,
            gpsTime: '21:04:14',
            bearing: 320,
            delay: 0,
          },
          {
            time: '22:10:00',
            nextDay: true,
          },
        ],
      },
    ],
    alerts: [],
  };
}

function createTransport(
  response: MobilibusHttpResponse | Promise<MobilibusHttpResponse>,
): MobilibusHttpTransport {
  return vi.fn(async () => response);
}

describe('createMobilibusClient', () => {
  it('pesquisa por código e nome sem diferenciar caixa ou acentuação', async () => {
    const transport = createTransport(jsonResponse(routesPayload()));
    const client = createMobilibusClient({ transport });

    await expect(client.searchLines('2890')).resolves.toEqual([
      {
        projectId: 501,
        routeId: 572385,
        shortName: '2890',
        name: 'Morada Nova / Pindorama / Cidade Industrial',
        network: 'Ótimo/RMBH',
        fare: 8.45,
      },
    ]);
    await expect(client.searchLines('SAO joao')).resolves.toEqual([
      {
        projectId: 501,
        routeId: 572386,
        shortName: '405R',
        name: 'São João / Terminal Metropolitano',
        network: 'Ótimo/RMBH',
        fare: null,
      },
    ]);
    expect(transport).toHaveBeenCalledWith(ROUTES_PATH, expect.any(Object));
  });

  it('mantém projectId e routeId distintos do código público e aceita tarifa ausente', async () => {
    const transport = createTransport(jsonResponse(routesPayload()));
    const client = createMobilibusClient({ transport });

    const [line] = await client.searchLines('405r');

    expect(line).toMatchObject({ projectId: 501, routeId: 572386, shortName: '405R', fare: null });
    expect(line?.shortName).not.toBe(String(line?.routeId));
  });

  it('traduz payload de catálogo inválido em erro de upstream', async () => {
    const client = createMobilibusClient({ transport: createTransport(jsonResponse({ routes: [] })) });

    await expect(client.searchLines('28')).rejects.toBeInstanceOf(BadGatewayError);
  });

  it('traduz falha HTTP da Mobilibus', async () => {
    const client = createMobilibusClient({ transport: createTransport(jsonResponse({}, 503)) });

    await expect(client.searchLines('28')).rejects.toMatchObject({
      name: 'BadGatewayError',
      statusCode: 502,
    });
  });

  it('compartilha a chamada em consultas simultâneas e expira o catálogo em 30 minutos', async () => {
    let now = 10_000;
    const transport = createTransport(jsonResponse(routesPayload()));
    const client = createMobilibusClient({
      transport,
      clock: { now: () => now },
    });

    await Promise.all([client.searchLines('28'), client.searchLines('cidade')]);
    expect(transport).toHaveBeenCalledOnce();

    now += 30 * 60 * 1000 - 1;
    await client.searchLines('28');
    expect(transport).toHaveBeenCalledOnce();

    now += 1;
    await client.searchLines('28');
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('normaliza sentidos, serviços e preserva a ordem das partidas', async () => {
    const transport = createTransport(jsonResponse(timetablePayload()));
    const client = createMobilibusClient({ transport });

    await expect(client.getTimetable(501, 572385)).resolves.toEqual({
      projectId: 501,
      routeId: 572385,
      directions: [
        {
          name: 'Ida',
          services: [
            { name: 'Dias Úteis', departures: ['06:30', '05:15'] },
            { name: 'Sábados', departures: ['07:10'] },
          ],
        },
        {
          name: 'Volta',
          services: [{ name: 'Domingos', departures: ['08:20', '09:40'] }],
        },
      ],
    });
    expect(transport).toHaveBeenCalledWith(TIMETABLE_PATH, expect.any(Object));
  });

  it('aceita resposta sem horários como uma programação vazia', async () => {
    const transport = createTransport(
      jsonResponse([{ routeId: 572385, timetable: { directions: [] } }]),
    );
    const client = createMobilibusClient({ transport });

    await expect(client.getTimetable(501, 572385)).resolves.toEqual({
      projectId: 501,
      routeId: 572385,
      directions: [],
    });
  });

  it('traduz payload de horários inválido e falha upstream', async () => {
    const invalidClient = createMobilibusClient({
      transport: createTransport(jsonResponse({ timetable: [] })),
    });
    await expect(invalidClient.getTimetable(501, 572385)).rejects.toBeInstanceOf(BadGatewayError);

    const failingClient = createMobilibusClient({
      transport: createTransport(jsonResponse({}, 502)),
    });
    await expect(failingClient.getTimetable(501, 572385)).rejects.toBeInstanceOf(BadGatewayError);
  });

  it('mantém cache de horários isolado e expira em 5 minutos', async () => {
    let now = 0;
    const transport = vi.fn(async (url: string) => {
      if (url === ROUTES_PATH) {
        return jsonResponse(routesPayload());
      }

      return jsonResponse(timetablePayload());
    });
    const client = createMobilibusClient({
      transport,
      clock: { now: () => now },
    });

    await client.searchLines('28');
    await Promise.all([client.getTimetable(501, 572385), client.getTimetable(501, 572385)]);
    expect(transport).toHaveBeenCalledTimes(2);

    now += 5 * 60 * 1000 - 1;
    await client.getTimetable(501, 572385);
    expect(transport).toHaveBeenCalledTimes(2);

    now += 1;
    await client.getTimetable(501, 572385);
    expect(transport).toHaveBeenCalledTimes(3);
    expect(transport).toHaveBeenNthCalledWith(1, ROUTES_PATH, expect.any(Object));
    expect(transport).toHaveBeenNthCalledWith(2, TIMETABLE_PATH, expect.any(Object));
  });

  it('rejeita projetos fora da rede Ótimo/RMBH antes do acesso externo', async () => {
    const transport = createTransport(jsonResponse(timetablePayload()));
    const client = createMobilibusClient({ transport });

    await expect(client.getTimetable(603, 572385)).rejects.toBeInstanceOf(BadRequestError);
    expect(transport).not.toHaveBeenCalled();
  });

  it('traduz rota inexistente e timeout', async () => {
    const missingClient = createMobilibusClient({
      transport: createTransport(jsonResponse({}, 404)),
    });
    await expect(missingClient.getTimetable(501, 999999)).rejects.toBeInstanceOf(NotFoundError);

    const emptyClient = createMobilibusClient({
      transport: createTransport(jsonResponse([])),
    });
    await expect(emptyClient.getTimetable(501, 999999)).rejects.toBeInstanceOf(NotFoundError);

    const timeoutClient = createMobilibusClient({
      timeoutMs: 1,
      transport: vi.fn(
        () => new Promise<MobilibusHttpResponse>(() => {}),
      ),
    });
    await expect(timeoutClient.searchLines('28')).rejects.toBeInstanceOf(GatewayTimeoutError);
  });

  it('normaliza pontos Mobilibus por tile e preserva dados públicos opcionais', async () => {
    const transport = createTransport(jsonResponse(stopsPayload()));
    const client = createMobilibusClient({ transport });

    await expect(client.getStopsInTile(501, { x: 6192, y: 9117, zoom: 16 })).resolves.toEqual([
      {
        projectId: 501,
        stopId: 15192689,
        latitude: -19.93193292,
        longitude: -43.93043518,
        name: 'Av. Afonso Pena, 2323 - Parada DEOESP',
        code: null,
        address: 'Avenida Afonso Pena 2328',
        bearing: 340,
      },
      {
        projectId: 501,
        stopId: 15192690,
        latitude: -19.932,
        longitude: -43.931,
        name: 'Praça Sete',
        code: 'P-02',
        address: null,
        bearing: null,
      },
    ]);
    expect(transport).toHaveBeenCalledWith(STOPS_PATH, expect.any(Object));
  });

  it('deduplica chamadas simultâneas e expira cache de pontos em 30 minutos', async () => {
    let now = 0;
    const transport = createTransport(jsonResponse(stopsPayload()));
    const client = createMobilibusClient({
      transport,
      clock: { now: () => now },
    });
    const tile = { x: 6192, y: 9117, zoom: 16 };

    await Promise.all([client.getStopsInTile(501, tile), client.getStopsInTile(501, tile)]);
    expect(transport).toHaveBeenCalledOnce();

    now += 30 * 60 * 1000 - 1;
    await client.getStopsInTile(501, tile);
    expect(transport).toHaveBeenCalledOnce();

    now += 1;
    await client.getStopsInTile(501, tile);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('rejeita projeto ou tile inválido e traduz payload de pontos inválido', async () => {
    const transport = createTransport(jsonResponse(stopsPayload()));
    const client = createMobilibusClient({ transport });

    await expect(client.getStopsInTile(603, { x: 6192, y: 9117, zoom: 16 })).rejects.toBeInstanceOf(
      BadRequestError,
    );
    await expect(client.getStopsInTile(501, { x: -1, y: 9117, zoom: 16 })).rejects.toBeInstanceOf(
      BadRequestError,
    );
    expect(transport).not.toHaveBeenCalled();

    const invalidClient = createMobilibusClient({
      transport: createTransport(jsonResponse({ stops: 'invalid' })),
    });
    await expect(invalidClient.getStopsInTile(501, { x: 6192, y: 9117, zoom: 16 })).rejects.toBeInstanceOf(
      BadGatewayError,
    );
  });

  it('normaliza partidas do ponto e separa posição em tempo real de programação', async () => {
    const transport = createTransport(jsonResponse(departuresPayload()));
    const client = createMobilibusClient({ transport });

    await expect(client.getDepartures(501, 15192689)).resolves.toEqual({
      projectId: 501,
      stopId: 15192689,
      stopName: 'Av. Afonso Pena, 2323 - Parada DEOESP',
      referenceTime: 1787529945917,
      departures: [
        {
          projectId: 501,
          stopId: 15192689,
          routeId: 572156,
          shortName: '3838',
          lineName: 'Rio Acima / Belo Horizonte',
          headsign: 'Belo Horizonte',
          color: '#ef7d01',
          scheduledTime: '21:22:09',
          nextDay: false,
          vehicleId: '25H74',
          positionAge: 91,
          gpsTime: '21:04:14',
          bearing: 320,
          delay: 0,
          realtime: true,
        },
        {
          projectId: 501,
          stopId: 15192689,
          routeId: 572156,
          shortName: '3838',
          lineName: 'Rio Acima / Belo Horizonte',
          headsign: 'Belo Horizonte',
          color: '#ef7d01',
          scheduledTime: '22:10:00',
          nextDay: true,
          vehicleId: null,
          positionAge: null,
          gpsTime: null,
          bearing: null,
          delay: null,
          realtime: false,
        },
      ],
    });
    expect(transport).toHaveBeenCalledWith(DEPARTURES_PATH, expect.any(Object));
  });

  it('deduplica chamadas simultâneas e expira partidas em 15 segundos', async () => {
    let now = 0;
    const transport = createTransport(jsonResponse(departuresPayload()));
    const client = createMobilibusClient({
      transport,
      clock: { now: () => now },
    });

    await Promise.all([
      client.getDepartures(501, 15192689),
      client.getDepartures(501, 15192689),
    ]);
    expect(transport).toHaveBeenCalledOnce();

    now += 15 * 1000 - 1;
    await client.getDepartures(501, 15192689);
    expect(transport).toHaveBeenCalledOnce();

    now += 1;
    await client.getDepartures(501, 15192689);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('rejeita projeto ou ponto inválido e traduz payload de partidas inválido', async () => {
    const transport = createTransport(jsonResponse(departuresPayload()));
    const client = createMobilibusClient({ transport });

    await expect(client.getDepartures(603, 15192689)).rejects.toBeInstanceOf(BadRequestError);
    await expect(client.getDepartures(501, 0)).rejects.toBeInstanceOf(BadRequestError);
    expect(transport).not.toHaveBeenCalled();

    const invalidClient = createMobilibusClient({
      transport: createTransport(jsonResponse({ trips: 'invalid' })),
    });
    await expect(invalidClient.getDepartures(501, 15192689)).rejects.toBeInstanceOf(
      BadGatewayError,
    );
  });
});
