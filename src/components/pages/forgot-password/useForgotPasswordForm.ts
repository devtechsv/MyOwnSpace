import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/router';
import { z } from 'zod';
import API from '@/services/api-services';

const schema = z.object({
  email: z.string().min(1, 'Ingresa tu correo').email('Correo inválido'),
});

export type ForgotPasswordInputs = z.infer<typeof schema>;

const useForgotPasswordForm = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInputs>({
    resolver: zodResolver(schema),
  });

  const onSubmit: SubmitHandler<ForgotPasswordInputs> = async (data) => {
    setIsSubmitting(true);
    try {
      await API.auth.forgotPassword({ correo: data.email });
    } finally {
      // Siempre navega a la confirmación, exista o no el correo — el
      // mock (y mañana la API real) nunca revela si está registrado.
      await router.push(
        `/forgot-password/sent?correo=${encodeURIComponent(data.email)}`,
      );
      setIsSubmitting(false);
    }
  };

  return { register, handleSubmit, onSubmit, errors, isSubmitting };
};

export default useForgotPasswordForm;
