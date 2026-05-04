import React from 'react';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * RHF-bound text input built on shadcn primitives. Renders a Label, Input,
 * and inline error message. Supports multiline via a <textarea> fallback.
 *
 * Usage:
 *   const { control } = useForm({ resolver: zodResolver(schema) });
 *   <FormField control={control} name="email" label="Email" type="email" />
 */
export default function FormField({
  control,
  name,
  label,
  type = 'text',
  required = false,
  multiline = false,
  rows = 4,
  placeholder,
  className,
  ...props
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const hasError = Boolean(error);
        const describedBy = hasError ? `${name}-error` : undefined;
        const sharedClass = cn(
          hasError && 'border-destructive focus-visible:ring-destructive',
          className
        );
        return (
          <div className="flex flex-col gap-1.5">
            {label && (
              <Label htmlFor={name}>
                {label}
                {required && <span className="ml-0.5 text-destructive">*</span>}
              </Label>
            )}
            {multiline ? (
              <textarea
                id={name}
                rows={rows}
                placeholder={placeholder}
                aria-invalid={hasError || undefined}
                aria-describedby={describedBy}
                className={cn(
                  'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  sharedClass
                )}
                {...field}
                {...props}
              />
            ) : (
              <Input
                id={name}
                type={type}
                placeholder={placeholder}
                aria-invalid={hasError || undefined}
                aria-describedby={describedBy}
                className={sharedClass}
                {...field}
                {...props}
              />
            )}
            {hasError && (
              <p id={describedBy} className="text-xs text-destructive">
                {error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}
