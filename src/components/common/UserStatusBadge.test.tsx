import { render, screen } from '@testing-library/react';
import { UserStatusBadge } from './UserStatusBadge';

describe('UserStatusBadge', () => {
  it.each([
    ['Activo', 'text-emerald-800'],
    ['Pendiente', 'text-amber-800'],
    ['Desactivado', 'text-slate-700'],
  ] as const)(
    'renderiza %s con su color correspondiente',
    (status, expectedClass) => {
      render(<UserStatusBadge status={status} />);
      expect(screen.getByText(status)).toHaveClass(expectedClass);
    },
  );
});
