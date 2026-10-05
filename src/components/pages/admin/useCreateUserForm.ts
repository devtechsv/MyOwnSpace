import { useState } from 'react';
import { useForm, useWatch, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import API from '@/services/api-services';
import { isPasswordValid } from '@/lib/password-rules';

const ROLES = ['Empleado', 'Administrador'] as const;

const schema = z
  .object({
    nombre: z.string().min(1, 'Ingresa el nombre completo'),
    correo: z.string().min(1, 'Ingresa el correo').email('Correo inválido'),
    rol: z.enum(ROLES),
    fechaIngreso: z.string().min(1, 'Ingresa la fecha de ingreso'),
    // Marcado (default): el backend genera la temporal. Desmarcado: el
    // admin la escribe y se envía igual por correo como temporal.
    generarAutomatica: z.boolean(),
    password: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.generarAutomatica && !isPasswordValid(data.password ?? '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'La contraseña no cumple los requisitos mínimos',
      });
    }
  });

export type CreateUserInputs = z.infer<typeof schema>;

interface Options {
  onSuccess?: () => void;
}

export function useCreateUserForm({ onSuccess }: Options = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<CreateUserInputs>({
    resolver: zodResolver(schema),
    defaultValues: { rol: 'Empleado', generarAutomatica: true, password: '' },
  });

  const generarAutomatica = useWatch({ control, name: 'generarAutomatica' });
  const password = useWatch({ control, name: 'password' }) ?? '';

  const onSubmit: SubmitHandler<CreateUserInputs> = async (data) => {
    const { generarAutomatica: generar, password: manual, ...rest } = data;
    setIsSubmitting(true);
    try {
      await API.users.create(generar ? rest : { ...rest, password: manual });
      reset();
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos crear el usuario.';
      // El backend también valida la contraseña: su error va a ese campo,
      // cualquier otro (correo duplicado, etc.) al de correo.
      setError(/contraseña/i.test(message) ? 'password' : 'correo', { message });
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
    generarAutomatica,
    password,
  };
}
