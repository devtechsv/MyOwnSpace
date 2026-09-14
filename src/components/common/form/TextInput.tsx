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

export const TextInput = forwardRef<HTMLInputElement, ITextInput>(
  (props, ref) => {
    const {
      className,
      classNames,
      error,
      type,
      name,
      onChange,
      label,
      ...rest
    } = props;

    const [isShowingPassword, setShowPassword] = useState(false);

    return (
      <div className={cx('relative', classNames?.container)}>
        <div className='relative'>
          <input
            ref={ref}
            name={name}
            id={name}
            placeholder=' '
            className={cx(
              'px-2.5 pb-2.5 pt-4 border-1 appearance-none border-gray-600 focus:border-blue-500 focus:outline-none peer block w-full h-[52px] ps-3 focus:ring-2  outline-none bg-dark-50 rounded-[10px] text-light-50 placeholder-[#4C4C4C]',
              classNames?.input,
              className,
            )}
            type={type === 'password' && isShowingPassword ? 'text' : type}
            {...rest}
          />
          {type === 'password' && (
            <button
              type='button'
              className='absolute transform -translate-y-1/2 top-1/2 right-3 text-gray-50'
              onClick={() => setShowPassword(!isShowingPassword)}
            >
              {isShowingPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
          )}

          <label
            htmlFor={name}
            className='absolute peer-placeholder-shown:text-[#4C4C4C] duration-300 transform -translate-y-4 top-[-15px] z-10 origin-[0] bg-transparent px-2 peer-focus:px-2 peer-focus:text-light-50  peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-[-15px] peer-focus:-translate-y-4 left-1'
          >
            {label}
          </label>
        </div>

        {error && (
          <span
            className={cx(
              'flex ps-3 gap-x-1 items-center mt-2 text-center text-sm text-red-400',
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
