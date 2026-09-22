import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from '@/hooks/useSession';
import API from '@/services/api-services';

const schema = z
  .object({
    modo: z.enum(['completa', 'personalizado']),
    horasPersonalizadas: z.string().optional(),
  })
  .refine(
    (data) =>
      data.modo === 'completa' ||
      (Boolean(data.horasPersonalizadas) && Number(data.horasPersonalizadas) > 0),
    {
      message: 'Ingresa una cantidad de horas mayor a 0',
      path: ['horasPersonalizadas'],
    },
  )
  .refine(
    (data) =>
      data.modo === 'completa' ||
      !data.horasPersonalizadas ||
      Number(data.horasPersonalizadas) <= 8,
    {
      message: 'No puede superar 8 (jornada completa)',
      path: ['horasPersonalizadas'],
    },
  );

export type RequestPtoInputs = z.infer<typeof schema>;

interface Options {
  fecha: string;
  onSuccess?: () => void;
}

export function useRequestPtoForm({ fecha, onSuccess }: Options) {
  const session = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RequestPtoInputs>({
    resolver: zodResolver(schema),
    defaultValues: { modo: 'completa', horasPersonalizadas: '' },
  });

  const modo = watch('modo');

  const onSubmit: SubmitHandler<RequestPtoInputs> = async (data) => {
    if (!session) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      const horas = data.modo === 'completa' ? 8 : Number(data.horasPersonalizadas);
      await API.pto.create(session.userId, { fecha, horas });
      reset();
      onSuccess?.();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'No pudimos reservar el PTO.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return { register, handleSubmit, onSubmit, errors, isSubmitting, serverError, modo };
}
