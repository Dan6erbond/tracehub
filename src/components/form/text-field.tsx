import { Input } from '#/components/ui/input'
import { FieldShell, useFieldInvalid } from './field-shell'
import { useFieldContext } from './form-context'
import type { ComponentProps } from 'react'

type InputProps = Omit<
  ComponentProps<typeof Input>,
  'id' | 'name' | 'value' | 'onBlur' | 'onChange' | 'aria-invalid'
>

export function TextField({
  label,
  description,
  ...props
}: InputProps & { label: string; description?: string }) {
  const field = useFieldContext<string>()
  return (
    <FieldShell label={label} description={description}>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        aria-invalid={useFieldInvalid()}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        {...props}
      />
    </FieldShell>
  )
}
