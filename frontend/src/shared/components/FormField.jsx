import { TextField } from '@mui/material';
import { Controller } from 'react-hook-form';

/**
 * RHF-bound TextField. Handles error display automatically.
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
  rows,
  sx = {},
  ...props
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          label={label}
          type={type}
          required={required}
          multiline={multiline}
          rows={rows}
          error={Boolean(error)}
          helperText={error?.message}
          fullWidth
          variant="outlined"
          sx={sx}
          {...props}
        />
      )}
    />
  );
}
