import { Switch } from '#/components/ui/switch'
import { FieldShell, useFieldInvalid } from './field-shell'
import { useFieldContext } from './form-context'

export function SwitchField({
  label,
  description,
}: {
  label: string
  description?: string
}) {
  const field = useFieldContext<boolean>()
  const invalid = useFieldInvalid()
  return (
    <FieldShell
      label={label}
      description={description}
      orientation="horizontal"
    >
      <Switch
        id={field.name}
        name={field.name}
        checked={field.state.value}
        aria-invalid={invalid}
        onBlur={field.handleBlur}
        onCheckedChange={field.handleChange}
      />
    </FieldShell>
  )
}
