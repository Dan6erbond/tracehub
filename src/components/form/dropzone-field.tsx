import { Dropzone } from '#/components/dropzone'
import { Field, FieldError } from '#/components/ui/field'
import { useFieldInvalid } from './field-shell'
import { useFieldContext } from './form-context'
import type { ComponentProps } from 'react'

export function DropzoneField(
  props: Omit<ComponentProps<typeof Dropzone>, 'invalid'>,
) {
  const field = useFieldContext<unknown>()
  const invalid = useFieldInvalid()
  return (
    <Field data-invalid={invalid}>
      <Dropzone {...props} invalid={invalid} />
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
