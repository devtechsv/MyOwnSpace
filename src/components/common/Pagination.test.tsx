import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('no renderiza nada con una sola página', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('con pocas páginas, muestra un botón por cada una', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={jest.fn()} />);
    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: `Página ${n}` })).toBeInTheDocument();
    }
  });

  it('marca la página actual con aria-current', () => {
    render(<Pagination page={3} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Página 3' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Página 2' })).not.toHaveAttribute('aria-current');
  });

  it('Anterior/Siguiente están deshabilitados en los extremos', () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={5} onPageChange={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).not.toBeDisabled();

    rerender(<Pagination page={5} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('clickear un número de página llama a onPageChange con ese número', () => {
    const onPageChange = jest.fn();
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('con muchas páginas, muestra una ventana alrededor de la actual con "…"', () => {
    render(<Pagination page={10} totalPages={20} onPageChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Página 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 9' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 10' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 11' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 20' })).toBeInTheDocument();
    // No debería renderizar TODAS las páginas intermedias.
    expect(screen.queryByRole('button', { name: 'Página 5' })).not.toBeInTheDocument();
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
  });
});
