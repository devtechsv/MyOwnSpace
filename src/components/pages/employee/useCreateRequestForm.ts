import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from '@/hooks/useSession';
import API from '@/services/api-services';

// 'Vacaciones' no vive acá — tiene su propio flujo de autoservicio
// (módulo de PTO, ver src/pages/pto.tsx) sin Motivo ni aprobación de
// admin, estructuralmente distinto de estos 4 tipos.
const TIPOS = ['Emergencia', 'Enfermedad', 'Permiso personal', 'Otro'] as const;

const schema = z
  .object({
    tipo: z.enum(TIPOS),
    fechaInicio: z.string().min(1, 'Ingresá la fecha de inicio'),
    fechaFin: z.string().min(1, 'Ingresá la fecha de fin'),
    // Opcionales — igual que en el backend, van juntas o ninguna.
    horaInicio: z.string().optional().or(z.literal('')),
    horaFin: z.string().optional().or(z.literal('')),
    motivo: z.string().min(1, 'Contanos brevemente el motivo').max(500),
  })
  .refine((data) => data.fechaFin >= data.fechaInicio, {
    message: 'No puede ser anterior a la fecha de inicio',
    path: ['fechaFin'],
  })
  .refine((data) => Boolean(data.horaInicio) === Boolean(data.horaFin), {
    message: 'Si cargás una hora de inicio, también hace falta la de fin (y viceversa)',
    path: ['horaFin'],
  })
  .refine(
    (data) =>
      !data.horaInicio ||
      !data.horaFin ||
      data.fechaInicio !== data.fechaFin ||
      data.horaFin > data.horaInicio,
    {
      message: 'No puede ser anterior o igual a la hora de inicio',
      path: ['horaFin'],
    },
  );

export type CreateRequestInputs = z.infer<typeof schema>;

interface Options {
  onSuccess?: () => void;
}

export function useCreateRequestForm({ onSuccess }: Options = {}) {
  const session = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRequestInputs>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'Emergencia' },
  });

  const onSubmit: SubmitHandler<CreateRequestInputs> = async (data) => {
    if (!session) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      await API.requests.create({
        employeeId: session.userId,
        tipo: data.tipo,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        horaInicio: data.horaInicio || undefined,
        horaFin: data.horaFin || undefined,
        motivo: data.motivo,
      });
      reset();
      onSuccess?.();
    } catch {
      setServerError('No pudimos crear la solicitud. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    serverError,
  };
}
