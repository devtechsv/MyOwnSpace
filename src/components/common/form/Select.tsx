import { forwardRef } from 'react';
import { cx } from '@/helpers/cx';

interface Option {
  value: string;
  label: string;
}

interface Props
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  name: string;
  options: Option[];
  error?: string;
  classNames?: {
    select?: string;
    label?: string;
    error?: string;
    container?: string;
  };
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, name, options, error, className, classNames, ...rest }, ref) => {
    return (
      <div
        className={cx('flex flex-col gap-1.5 w-full', classNames?.container)}
      >
        <label
          htmlFor={name}
          className={cx('text-xs font-semibold text-muted', classNames?.label)}
        >
          {label}
        </label>
        <select
          ref={ref}
          id={name}
          name={name}
          className={cx(
            'w-full px-3.5 py-3 border border-border rounded-[10px] bg-surface-field text-sm text-foreground appearance-none focus:outline-none focus:border-turquoise-blue-400 focus:ring-2 focus:ring-turquoise-blue-400/40',
            classNames?.select,
            className,
          )}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span
            role = 'alert'
            className={cx(
              'flex gap-x-1 items-center text-xs text-red-400',
              classNames?.error,
            )}
          >
            {error}
          </span>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
