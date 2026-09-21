import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import API from '@/services/api-services';

const ROLES = ['Empleado', 'Administrador'] as const;

const schema = z.object({
  nombre: z.string().min(1, 'Ingresá el nombre completo'),
  correo: z.string().min(1, 'Ingresá el correo').email('Correo inválido'),
  rol: z.enum(ROLES),
  fechaIngreso: z.string().min(1, 'Ingresá la fecha de ingreso'),
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
    formState: { errors },
  } = useForm<CreateUserInputs>({
    resolver: zodResolver(schema),
    defaultValues: { rol: 'Empleado' },
  });

  const onSubmit: SubmitHandler<CreateUserInputs> = async (data) => {
    setIsSubmitting(true);
    try {
      await API.users.create(data);
      reset();
      onSuccess?.();
    } catch (err) {
      setError('correo', {
        message:
          err instanceof Error ? err.message : 'No pudimos crear el usuario.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { register, handleSubmit, onSubmit, errors, isSubmitting };
}
