import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import App from './App.vue';

describe('App', () => {
  it('renders the scaffold headline', () => {
    const wrapper = mount(App);

    expect(wrapper.text()).toContain('Alerta pessoal de chegada');
  });
});
