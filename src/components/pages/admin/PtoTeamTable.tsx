import { PtoRow } from './useAdminPto';

interface Props {
  rows: PtoRow[];
  isLoading: boolean;
  error: string | null;
}

export function PtoTeamTable({ rows, isLoading, error }: Props) {
  if (error) {
    return <p className='text-sm text-red-500'>{error}</p>;
  }

  if (isLoading) {
    return <p className='text-sm text-muted'>Cargando…</p>;
  }

  if (rows.length === 0) {
    return <p className='text-sm text-muted'>No hay reservas de PTO para este filtro.</p>;
  }

  return (
    <table className='w-full text-sm'>
      <thead>
        <tr className='text-left text-muted border-b border-border'>
          <th className='py-2.5 font-semibold'>Empleado</th>
          <th className='py-2.5 font-semibold'>Fecha</th>
          <th className='py-2.5 font-semibold'>Horas</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className='border-b border-border last:border-0'>
            <td className='py-2.5 text-foreground'>{row.employeeName}</td>
            <td className='py-2.5 text-foreground'>{row.fechaInicio}</td>
            <td className='py-2.5 text-foreground'>{row.horasSolicitadas}h</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
