import { createFormHook } from '@tanstack/react-form'
import { DropzoneField } from './dropzone-field'
import { fieldContext, formContext } from './form-context'
import { SelectField } from './select-field'
import { SubmitButton } from './submit-button'
import { SwitchField } from './switch-field'
import { TextField } from './text-field'
import { TextareaField } from './textarea-field'

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    TextareaField,
    SelectField,
    SwitchField,
    DropzoneField,
  },
  formComponents: { SubmitButton },
})
