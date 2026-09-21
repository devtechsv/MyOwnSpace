import { render, screen, fireEvent } from '@testing-library/react';
import { PtoCalendar, esFinDeSemana } from './PtoCalendar';
import { LeaveRequest } from '@/contracts/interfaces/request';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function iso(year: number, monthZeroBased: number, day: number): string {
  return `${year}-${pad(monthZeroBased + 1)}-${pad(day)}`;
}

// El mes que se muestra por defecto es el actual — busca el primer día
// hábil (no fin de semana) de ese mes, para no depender de qué día real
// se corran los tests.
function primerDiaHabilDelMesActual(): string {
  const hoy = new Date();
  let dia = 1;
  while (esFinDeSemana(hoy.getFullYear(), hoy.getMonth(), dia)) {
    dia++;
  }
  return iso(hoy.getFullYear(), hoy.getMonth(), dia);
}

// Encuentra un sábado o domingo del mes actual, para probar el bloqueo.
function primerFinDeSemanaDelMesActual(): string {
  const hoy = new Date();
  let dia = 1;
  while (!esFinDeSemana(hoy.getFullYear(), hoy.getMonth(), dia)) {
    dia++;
  }
  return iso(hoy.getFullYear(), hoy.getMonth(), dia);
}

function reservaDe(fecha: string): LeaveRequest {
  return {
    id: 'r-test',
    employeeId: 'u4',
    tipo: 'Vacaciones',
    fechaInicio: fecha,
    fechaFin: fecha,
    horasSolicitadas: 8,
    motivo: 'Vacaciones — autoservicio (sin motivo)',
    estado: 'Aprobada',
    createdAt: new Date().toISOString(),
  };
}

describe('PtoCalendar', () => {
  it('llama a onSelectDate con la fecha ISO correcta al clickear un día hábil sin reservar', () => {
    const diaHabil = primerDiaHabilDelMesActual();
    const onSelectDate = jest.fn();
    render(<PtoCalendar reservas={[]} onSelectDate={onSelectDate} />);

    fireEvent.click(screen.getByLabelText(`Reservar PTO el ${diaHabil}`));

    expect(onSelectDate).toHaveBeenCalledWith(diaHabil);
  });

  it('marca visualmente un día ya reservado', () => {
    const diaHabil = primerDiaHabilDelMesActual();
    render(
      <PtoCalendar reservas={[reservaDe(diaHabil)]} onSelectDate={jest.fn()} />,
    );

    expect(screen.getByLabelText(`PTO reservado el ${diaHabil}`)).toBeInTheDocument();
  });

  it('un día reservado también dispara onSelectDate al clickearlo', () => {
    const diaHabil = primerDiaHabilDelMesActual();
    const onSelectDate = jest.fn();
    render(
      <PtoCalendar reservas={[reservaDe(diaHabil)]} onSelectDate={onSelectDate} />,
    );

    fireEvent.click(screen.getByLabelText(`PTO reservado el ${diaHabil}`));

    expect(onSelectDate).toHaveBeenCalledWith(diaHabil);
  });

  it('un fin de semana sin reservar no es clickeable (calendario laboral)', () => {
    const finDeSemana = primerFinDeSemanaDelMesActual();
    const onSelectDate = jest.fn();
    render(<PtoCalendar reservas={[]} onSelectDate={onSelectDate} />);

    const boton = screen.getByLabelText(`No disponible — fin de semana, ${finDeSemana}`);
    expect(boton).toBeDisabled();
    fireEvent.click(boton);

    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it('un fin de semana YA reservado se sigue mostrando y dejando clickear', () => {
    const finDeSemana = primerFinDeSemanaDelMesActual();
    const onSelectDate = jest.fn();
    render(
      <PtoCalendar reservas={[reservaDe(finDeSemana)]} onSelectDate={onSelectDate} />,
    );

    fireEvent.click(screen.getByLabelText(`PTO reservado el ${finDeSemana}`));

    expect(onSelectDate).toHaveBeenCalledWith(finDeSemana);
  });

  it('navega al mes siguiente y vuelve al mes anterior', () => {
    render(<PtoCalendar reservas={[]} onSelectDate={jest.fn()} />);
    const tituloInicial = screen.getByText(/\d{4}/).textContent;

    fireEvent.click(screen.getByLabelText('Mes siguiente'));
    expect(screen.getByText(/\d{4}/).textContent).not.toBe(tituloInicial);

    fireEvent.click(screen.getByLabelText('Mes anterior'));
    expect(screen.getByText(/\d{4}/).textContent).toBe(tituloInicial);
  });
});
