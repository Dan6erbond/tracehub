import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '#/components/ui/field'
import { Switch } from '#/components/ui/switch'
import { useFieldContext } from './form-context'

export function SwitchField({
  label,
  description,
}: {
  label: string
  description?: string
}) {
  const field = useFieldContext<boolean>()
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
      <Switch
        id={field.name}
        checked={field.state.value}
        onCheckedChange={field.handleChange}
      />
    </Field>
  )
}
