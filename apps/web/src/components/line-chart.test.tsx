/**
 * line-chart.test.tsx — accessibility structure tests for LineChart.
 * Verifies that the chart renders a <details>/<table> text alternative.
 */
import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { LineChart } from './line-chart';
import type { ChartDataPoint } from '@gzclp/shared/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATA_WITH_RESULTS: ChartDataPoint[] = [
  { workout: 1, weight: 60, stage: 0, result: 'success' },
  { workout: 2, weight: 62.5, stage: 0, result: 'success' },
  { workout: 3, weight: 65, stage: 0, result: 'fail' },
];

const EMPTY_DATA: ChartDataPoint[] = [];

// ---------------------------------------------------------------------------
// accessibility
// ---------------------------------------------------------------------------

describe('LineChart', () => {
  describe('accessibility', () => {
    it('renders a <details> element containing a <table> with correct row count', () => {
      render(<LineChart data={DATA_WITH_RESULTS} label="Sentadilla" />);

      const details = document.querySelector('details');
      expect(details).not.toBeNull();

      const table = details?.querySelector('table');
      expect(table).not.toBeNull();

      const rows = table?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(DATA_WITH_RESULTS.length);
    });

    it('empty data renders the "No hay datos disponibles" message', () => {
      render(<LineChart data={EMPTY_DATA} label="Sentadilla" />);

      const message = screen.getByText('No hay datos disponibles');
      expect(message).toBeDefined();
    });

    it('renders a <figcaption> with sr-only class containing the label', () => {
      render(<LineChart data={DATA_WITH_RESULTS} label="Press Banca" />);

      const figcaption = document.querySelector('figcaption');
      expect(figcaption?.textContent).toBe('Press Banca');
      expect(figcaption?.className).toContain('sr-only');
    });

    it('renders a <figure> wrapper for the canvas', () => {
      render(<LineChart data={DATA_WITH_RESULTS} label="Peso Muerto" />);

      const figure = document.querySelector('figure');
      expect(figure).not.toBeNull();

      const canvas = figure?.querySelector('canvas');
      expect(canvas).not.toBeNull();
    });
  });
});
