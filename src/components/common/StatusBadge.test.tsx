import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['Pendiente', 'text-amber-800'],
    ['Aprobada', 'text-emerald-800'],
    ['Denegada', 'text-red-800'],
  ] as const)(
    'renderiza %s con su color correspondiente',
    (status, expectedClass) => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(status)).toHaveClass(expectedClass);
    },
  );
});
