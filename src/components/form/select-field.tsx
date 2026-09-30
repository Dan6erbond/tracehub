import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { FieldShell, useFieldInvalid } from './field-shell'
import { useFieldContext } from './form-context'

export function SelectField<TValue extends string>({
  label,
  description,
  options,
}: {
  label: string
  description?: string
  options: ReadonlyArray<{ value: TValue; label: string }>
}) {
  const field = useFieldContext<TValue>()
  return (
    <FieldShell label={label} description={description}>
      <Select
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value as TValue)}
      >
        <SelectTrigger
          id={field.name}
          aria-invalid={useFieldInvalid()}
          onBlur={field.handleBlur}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  )
}
