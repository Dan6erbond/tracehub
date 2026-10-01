import {
  Field,
  FieldContent,
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

/** Label, description and errors around a control; `horizontal` puts the control beside the text, as for switches. */
export function FieldShell({
  label,
  description,
  orientation = 'vertical',
  children,
}: {
  label: string
  description?: string
  orientation?: 'vertical' | 'horizontal'
  children: ReactNode
}) {
  const field = useFieldContext<unknown>()
  const invalid = useFieldInvalid()
  const labelElement = <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
  const details = (
    <>
      {description && <FieldDescription>{description}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </>
  )

  if (orientation === 'horizontal')
    return (
      <Field orientation="horizontal" data-invalid={invalid}>
        <FieldContent>
          {labelElement}
          {details}
        </FieldContent>
        {children}
      </Field>
    )
  return (
    <Field data-invalid={invalid}>
      {labelElement}
      {children}
      {details}
    </Field>
  )
}
