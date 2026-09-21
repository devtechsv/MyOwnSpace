import { cx } from '@/helpers/cx';
import { forwardRef, useState } from 'react';
import { FaExclamationCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

interface ITextInput
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'ref'> {
  classNames?: {
    input?: string;
    label?: string;
    error?: string;
    container?: string;
  };
  error?: string;
  name: string;
  type?: string;
  label: string;
}

// Label chico fijo arriba del campo (no floating label) — coincide con
// el mockup validado y evita la fragilidad del patrón peer-*.
export const TextInput = forwardRef<HTMLInputElement, ITextInput>(
  (props, ref) => {
    const { className, classNames, error, type, name, label, ...rest } =
      props;

    const [isShowingPassword, setShowPassword] = useState(false);

    return (
      <div className={cx('flex flex-col gap-1.5 w-full', classNames?.container)}>
        <label
          htmlFor={name}
          className={cx('text-xs font-semibold text-muted', classNames?.label)}
        >
          {label}
        </label>

        <div className='relative'>
          <input
            ref={ref}
            name={name}
            id={name}
            className={cx(
              'w-full px-3.5 py-3 border border-border rounded-[10px] bg-surface-field text-sm text-foreground appearance-none focus:outline-none focus:border-turquoise-blue-400 focus:ring-2 focus:ring-turquoise-blue-400/40',
              type === 'password' && 'pr-10',
              classNames?.input,
              className,
            )}
            type={type === 'password' && isShowingPassword ? 'text' : type}
            {...rest}
          />
          {type === 'password' && (
            <button
              type='button'
              tabIndex={-1}
              className='absolute transform -translate-y-1/2 top-1/2 right-3 text-muted'
              onClick={() => setShowPassword(!isShowingPassword)}
            >
              {isShowingPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
          )}
        </div>

        {error && (
          <span
            role = 'alert'
            className={cx(
              'flex gap-x-1 items-center text-xs text-red-400',
              classNames?.error,
            )}
          >
            <FaExclamationCircle />
            {error}
          </span>
        )}
      </div>
    );
  },
);

TextInput.displayName = 'TextInput';
