import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/router';
import { z } from 'zod';
import API from '@/services/api-services';

const schema = z.object({
  email: z.string().min(1, 'Ingresá tu correo').email('Correo inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

export type LoginInputs = z.infer<typeof schema>;

const useLoginForm = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInputs>({
    resolver: zodResolver(schema),
  });

  const onSubmit: SubmitHandler<LoginInputs> = async (data) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const session = await API.auth.login({
        correo: data.email,
        password: data.password,
      });

      const destino =
        session.rol === 'Administrador' ? '/admin/requests' : '/';
      await router.push(destino);
    } catch {
      // Nunca se confirma si el correo existe o no — mensaje genérico.
      setServerError('Correo o contraseña incorrectos.');
      setIsSubmitting(false);
    }
  };

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    serverError,
    isSubmitting,
  };
};

export default useLoginForm;
