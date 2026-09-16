import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

const options = [
  { value: 'a', label: 'Opción A' },
  { value: 'b', label: 'Opción B' },
];

describe('Select', () => {
  it('asocia el label con el select y renderiza las opciones', () => {
    render(<Select label='Elegí una' name='campo' options={options} />);

    const select = screen.getByLabelText('Elegí una');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Opción A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Opción B' })).toBeInTheDocument();
  });

  it('permite seleccionar una opción', () => {
    render(<Select label='Elegí una' name='campo' options={options} />);

    const select = screen.getByLabelText('Elegí una') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'b' } });

    expect(select.value).toBe('b');
  });

  it('muestra el mensaje de error cuando se provee', () => {
    render(
      <Select
        label='Elegí una'
        name='campo'
        options={options}
        error='Campo requerido'
      />,
    );

    expect(screen.getByText('Campo requerido')).toBeInTheDocument();
  });
});
