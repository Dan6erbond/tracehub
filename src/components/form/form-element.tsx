import { cn } from '#/lib/utils'
import { useFormContext } from './form-context'
import type { ComponentProps } from 'react'

/**
 * The `<form>` of an `AppForm`, submitting through it, with a clear gap between its blocks (`FormFields`, alerts, actions).
 * A failed submit is reported by the mutation behind it, so the rejection is only logged rather than rethrown.
 */
export function FormElement({
  className,
  ...props
}: Omit<ComponentProps<'form'>, 'onSubmit'>) {
  const form = useFormContext()
  return (
    <form
      className={cn('flex flex-col gap-8', className)}
      {...props}
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit().catch((error: unknown) => console.error(error))
      }}
    />
  )
}
