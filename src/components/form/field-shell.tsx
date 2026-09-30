import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '#/components/ui/field'
import { useFieldContext } from './form-context'
import type { ReactNode } from 'react'

export function useFieldInvalid() {
  const { isTouched, isValid } = useFieldContext<unknown>().state.meta
  return isTouched && !isValid
}

export function FieldShell({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  const field = useFieldContext<unknown>()
  const invalid = useFieldInvalid()
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
