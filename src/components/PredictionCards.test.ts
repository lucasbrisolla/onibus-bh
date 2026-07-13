import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PredictionCards from './PredictionCards.vue';
import type { Prediction } from '../domain/types';

const predictions: Prediction[] = [
  {
    id: 'first',
    lineCode: '1145',
    description: 'BAIRRO DAS INDUSTRIAS/CENTRO VIA...',
    destination: 'BAIRRO DAS INDUSTRIAS/CENTRO VIA...',
    minutes: Number.NaN,
    departureLabel: 'Saída 19h45',
    queryTime: null,
    serviceId: '1145-1',
    vehicleId: null,
    color: null,
    accessibilityCode: null,
    variant: 'not-applicable',
  },
  {
    id: 'second',
    lineCode: '1145',
    description: 'BAIRRO DAS INDUSTRIAS/CENTRO VIA...',
    destination: 'BAIRRO DAS INDUSTRIAS/CENTRO VIA...',
    minutes: Number.NaN,
    departureLabel: 'Saída 20h15',
    queryTime: null,
    serviceId: '1145-2',
    vehicleId: null,
    color: null,
    accessibilityCode: null,
    variant: 'not-applicable',
  },
];

describe('PredictionCards', () => {
  it('highlights the first prediction as next only when no prediction is selected', () => {
    const wrapper = mount(PredictionCards, {
      props: {
        predictions,
        selectedPredictionId: null,
      },
    });

    const cards = wrapper.findAll('.prediction-card');
    expect(cards[0].classes()).toContain('is-next');
    expect(cards[1].classes()).not.toContain('is-next');
  });

  it('does not keep the first prediction highlighted when another prediction is selected', () => {
    const wrapper = mount(PredictionCards, {
      props: {
        predictions,
        selectedPredictionId: 'second',
      },
    });

    const cards = wrapper.findAll('.prediction-card');
    expect(cards[0].classes()).not.toContain('is-next');
    expect(cards[1].classes()).toContain('is-selected');
  });

  it('does not show arrival helper text in prediction cards', () => {
    const wrapper = mount(PredictionCards, {
      props: {
        predictions: [
          {
            ...predictions[0],
            id: 'minutes',
            minutes: 3,
            departureLabel: null,
          },
        ],
        selectedPredictionId: null,
      },
    });

    expect(wrapper.text()).toContain('3 min');
    expect(wrapper.text()).not.toContain('Chegando');
  });

  it('renders all-caps destinations with title-style casing', () => {
    const wrapper = mount(PredictionCards, {
      props: {
        predictions: [
          {
            ...predictions[0],
            destination: 'ESTACAO SAO GABRIEL/ESTACAO BARREIRO',
          },
        ],
        selectedPredictionId: null,
      },
    });

    expect(wrapper.text()).toContain('Estacao Sao Gabriel/Estacao Barreiro');
    expect(wrapper.text()).not.toContain('ESTACAO SAO GABRIEL');
  });
});
