import { useState } from 'react';
import { LeaveRequest } from '@/contracts/interfaces/request';

interface Props {
  reservas: LeaveRequest[];
  onSelectDate: (fecha: string) => void;
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toIso(year: number, monthZeroBased: number, day: number): string {
  return `${year}-${pad(monthZeroBased + 1)}-${pad(day)}`;
}

// "Calendario laboral" (requerimiento original): los fines de semana no
// son días hábiles, así que no se pueden reservar. Los feriados quedan
// afuera a propósito — necesitarían una fuente de datos que hoy no
// existe en el proyecto.
export function esFinDeSemana(year: number, monthZeroBased: number, day: number): boolean {
  const diaSemana = new Date(year, monthZeroBased, day).getDay();
  return diaSemana === 0 || diaSemana === 6;
}

export function PtoCalendar({ reservas, onSelectDate }: Props) {
  const hoy = new Date();
  const hoyIso = toIso(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const [cursor, setCursor] = useState({
    year: hoy.getFullYear(),
    month: hoy.getMonth(),
  });

  const reservasPorFecha = new Set(reservas.map((r) => r.fechaInicio));

  const primerDiaSemana = new Date(cursor.year, cursor.month, 1).getDay();
  const diasEnMes = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array(primerDiaSemana).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  const nombreMes = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    'es-AR',
    { month: 'long', year: 'numeric' },
  );

  return (
    <div className='bg-surface border border-border rounded-2xl p-5'>
      <div className='flex items-center justify-between mb-4'>
        <button
          type='button'
          aria-label='Mes anterior'
          onClick={() =>
            setCursor((c) =>
              c.month === 0
                ? { year: c.year - 1, month: 11 }
                : { year: c.year, month: c.month - 1 },
            )
          }
          className='px-2 py-1 text-muted hover:text-foreground'
        >
          ‹
        </button>
        <span className='text-sm font-semibold text-foreground capitalize'>
          {nombreMes}
        </span>
        <button
          type='button'
          aria-label='Mes siguiente'
          onClick={() =>
            setCursor((c) =>
              c.month === 11
                ? { year: c.year + 1, month: 0 }
                : { year: c.year, month: c.month + 1 },
            )
          }
          className='px-2 py-1 text-muted hover:text-foreground'
        >
          ›
        </button>
      </div>

      <div className='grid grid-cols-7 gap-1 text-center text-xs text-muted mb-2'>
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className='grid grid-cols-7 gap-1'>
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`vacio-${i}`} />;
          const fecha = toIso(cursor.year, cursor.month, dia);
          const reservado = reservasPorFecha.has(fecha);
          const finDeSemana = esFinDeSemana(cursor.year, cursor.month, dia);
          const pasado = fecha < hoyIso;
          // Un día no disponible ya reservado (ej. dato viejo, de antes
          // de esta restricción) se sigue mostrando y dejando clickear —
          // solo se bloquea reservar uno nuevo.
          const noHabil = !reservado && (finDeSemana || pasado);

          if (noHabil) {
            const motivo = finDeSemana ? 'fin de semana' : 'fecha pasada';
            return (
              <button
                key={fecha}
                type='button'
                disabled
                aria-label={`No disponible — ${motivo}, ${fecha}`}
                className='h-10 rounded-lg text-sm text-muted/50 cursor-not-allowed'
              >
                {dia}
              </button>
            );
          }

          return (
            <button
              key={fecha}
              type='button'
              onClick={() => onSelectDate(fecha)}
              aria-label={`${reservado ? 'PTO reservado el' : 'Reservar PTO el'} ${fecha}`}
              className={
                reservado
                  ? 'h-10 rounded-lg text-sm font-semibold bg-turquoise-blue-500 text-white'
                  : 'h-10 rounded-lg text-sm text-foreground hover:bg-surface-field'
              }
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}
