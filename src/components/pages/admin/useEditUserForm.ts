import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import API from '@/services/api-services';
import { errorMessage } from '@/helpers/error-message';
import { User } from '@/contracts/interfaces/user';

const ROLES = ['Empleado', 'Administrador'] as const;

const schema = z.object({
  nombre: z.string().min(1, 'Ingresa el nombre completo'),
  correo: z.string().min(1, 'Ingresa el correo').email('Correo inválido'),
  rol: z.enum(ROLES),
});

export type EditUserInputs = z.infer<typeof schema>;

interface Options {
  user: User;
  onSuccess?: () => void;
}

export function useEditUserForm({ user, onSuccess }: Options) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EditUserInputs>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
    },
  });

  const onSubmit: SubmitHandler<EditUserInputs> = async (data) => {
    setIsSubmitting(true);
    try {
      await API.users.update(user.id, data);
      onSuccess?.();
    } catch (err) {
      setError('correo', {
        // errorMessage: el `detail` del API (p. ej. "Ya existe un usuario
        // con ese correo.") en vez de "Request failed with status code 409".
        message: errorMessage(err, 'No pudimos editar el usuario.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { register, handleSubmit, onSubmit, errors, isSubmitting };
}