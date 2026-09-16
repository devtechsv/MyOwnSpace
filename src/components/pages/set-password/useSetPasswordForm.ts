import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useRouter } from 'next/router';
import { isPasswordValid } from '@/lib/password-rules';
import API from '@/services/api-services';

export interface SetPasswordInputs {
  password: string;
  confirmPassword: string;
}

const useSetPasswordForm = () => {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, watch } = useForm<SetPasswordInputs>({
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = isPasswordValid(password) && passwordsMatch;

  const onSubmit: SubmitHandler<SetPasswordInputs> = async (data) => {
    if (!canSubmit) return;

    setServerError(null);
    setIsSubmitting(true);

    try {
      await API.auth.setPassword({ token, nuevaPassword: data.password });
      await router.push('/login');
    } catch {
      setServerError(
        'No pudimos actualizar tu contraseña. El enlace puede haber expirado.',
      );
      setIsSubmitting(false);
    }
  };

  return {
    register,
    handleSubmit,
    onSubmit,
    password,
    confirmPassword,
    passwordsMatch,
    canSubmit,
    isSubmitting,
    serverError,
  };
};

export default useSetPasswordForm;
