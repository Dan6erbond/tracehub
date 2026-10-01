import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'

/** The address to register as the OAuth app's authorization callback on the Git host. */
export function CallbackUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Field>
      <FieldLabel htmlFor="callback-url">Callback URL</FieldLabel>
      <div className="flex gap-2">
        <Input id="callback-url" value={url} readOnly />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Copy callback URL"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <FieldDescription>
        Register this as the authorization callback URL of the OAuth app on the
        Git host.
      </FieldDescription>
    </Field>
  )
}
