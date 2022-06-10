import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';

import { AppShell } from '../src/AppShell.js';
import '../src/app-shell.js';

describe('AppShell', () => {
  let element: AppShell;
  beforeEach(async () => {
    element = await fixture(html`<app-shell></app-shell>`);
  });

  it('renders start button', () => {
    const button = element.shadowRoot!.querySelector('button')!;
    expect(button).to.exist;
  });
});
