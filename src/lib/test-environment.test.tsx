import { render, screen } from '@testing-library/react';
import { cx } from '@/helpers/cx';

function Greeting() {
  return <div className={cx('a', 'b')}>Hola mundo</div>;
}

describe('entorno de testing', () => {
  it('renderiza componentes TSX con el alias @/ y los matchers de jest-dom', () => {
    render(<Greeting />);
    expect(screen.getByText('Hola mundo')).toBeInTheDocument();
  });
});
