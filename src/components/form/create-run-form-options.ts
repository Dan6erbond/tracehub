import { formOptions } from '@tanstack/react-form'
import { createRunFormSchema } from '#/lib/schemas/create-run-form'
import type { CreateRunFormValues } from '#/lib/schemas/create-run-form'

const defaultValues: CreateRunFormValues = {
  title: '',
  description: '',
  sha: '',
  externalRunId: '',
  ciUrl: '',
  pinned: false,
  traces: [],
}

export const createRunFormOptions = formOptions({
  defaultValues,
  validators: { onSubmit: createRunFormSchema },
})
