import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/router';
import { z } from 'zod';
import API from '@/services/api-services';
import { esDemasiadosIntentos, MENSAJE_DEMASIADOS_INTENTOS } from '@/helpers/demasiados-intentos';

const schema = z.object({
  email: z.string().min(1, 'Ingresa tu correo').email('Correo inválido'),
});

export type ForgotPasswordInputs = z.infer<typeof schema>;

const useForgotPasswordForm = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInputs>({
    resolver: zodResolver(schema),
  });

  const onSubmit: SubmitHandler<ForgotPasswordInputs> = async (data) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await API.auth.forgotPassword({ correo: data.email });
    } catch (err) {
      // El límite de intentos es por IP, no por cuenta: avisarlo no revela
      // si el correo existe. Sin esto, la pantalla siguiente decía que se
      // enviaron instrucciones que nunca salieron.
      if (esDemasiadosIntentos(err)) {
        setServerError(MENSAJE_DEMASIADOS_INTENTOS);
        setIsSubmitting(false);
        return;
      }
    }
    // Cualquier otro resultado navega a la confirmación, exista o no el
    // correo: la API nunca revela si está registrado.
    await router.push(
      `/forgot-password/sent?correo=${encodeURIComponent(data.email)}`,
    );
    setIsSubmitting(false);
  };

  return { register, handleSubmit, onSubmit, errors, serverError, isSubmitting };
};

export default useForgotPasswordForm;
