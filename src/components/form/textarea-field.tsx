import { Textarea } from '#/components/ui/textarea'
import { FieldShell, useFieldInvalid } from './field-shell'
import { useFieldContext } from './form-context'
import type { ComponentProps } from 'react'

type TextareaProps = Omit<
  ComponentProps<typeof Textarea>,
  'id' | 'name' | 'value' | 'onBlur' | 'onChange' | 'aria-invalid'
>

export function TextareaField({
  label,
  description,
  ...props
}: TextareaProps & { label: string; description?: string }) {
  const field = useFieldContext<string>()
  return (
    <FieldShell label={label} description={description}>
      <Textarea
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
