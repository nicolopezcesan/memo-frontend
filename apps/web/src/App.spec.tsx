import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App.js';

describe('App', () => {
  it('renders the lobby at the root route', () => {
    render(<App />);
    expect(
      screen.getByText('Elegí tu nombre y el tamaño del tablero.'),
    ).toBeInTheDocument();
  });
});
