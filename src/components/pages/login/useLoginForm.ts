import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/router';
import { z } from 'zod';
import API from '@/services/api-services';
import { getHomeRoute } from '@/helpers/get-home-route';
import { esServidorNoDisponible } from '@/helpers/servidor-no-disponible';

export const MENSAJE_SERVIDOR_NO_DISPONIBLE =
  'No pudimos conectar con el servidor. Intenta de nuevo en unos minutos.';

const schema = z.object({
  email: z.string().min(1, 'Ingresa tu correo').email('Correo inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export type LoginInputs = z.infer<typeof schema>;

const useLoginForm = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<LoginInputs>({
    resolver: zodResolver(schema),
  });

  const sessionExpired = router.query.expired === '1';
  const servidorNoDisponible = router.query.unavailable === '1';

  const onSubmit: SubmitHandler<LoginInputs> = async (data) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const session = await API.auth.login({
        correo: data.email,
        password: data.password,
      });

      await router.push(getHomeRoute(session.rol));
    } catch (err) {
      // Con la API caída no hay que culpar a las credenciales. Si el
      // servidor sí respondió, mensaje genérico: nunca se confirma si el
      // correo existe o no.
      setServerError(
        esServidorNoDisponible(err) ? MENSAJE_SERVIDOR_NO_DISPONIBLE : 'Correo o contraseña incorrectos.',
      );
      // No dejar la contraseña tipeada viva en el input tras un fallo.
      resetField('password');
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
    sessionExpired,
    servidorNoDisponible,
  };
};

export default useLoginForm;
