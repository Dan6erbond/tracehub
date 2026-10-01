import { ChevronDown, Info } from 'lucide-react'
import { ExternalTextLink } from '#/components/external-text-link'
import { SectionHeading } from '#/components/section-heading'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { setupGuides } from '#/lib/provider-setup-guides'
import type { GuideVariant } from '#/lib/provider-setup-guides'
import { normalizeBaseUrl, providerUrlSchema } from '#/lib/schemas/git-provider'
import type { GitProviderType } from '#/lib/schemas/git-provider'

/** The link only exists while the entered base URL is a usable address. */
const hostUrl = (baseUrl: string, path: string) =>
  providerUrlSchema.safeParse(baseUrl).success
    ? normalizeBaseUrl(baseUrl) + path
    : undefined

function VariantSteps({
  variant,
  baseUrl,
}: {
  variant: GuideVariant
  baseUrl: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
        {variant.steps.map(({ text, link }) => (
          <li key={text}>
            {text}
            {link && hostUrl(baseUrl, link.path) && (
              <>
                {' '}
                <ExternalTextLink href={hostUrl(baseUrl, link.path)}>
                  {link.label}
                </ExternalTextLink>
              </>
            )}
          </li>
        ))}
      </ol>
      {variant.note && (
        <Alert>
          <Info />
          <AlertDescription>{variant.note}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

/** How to register the OAuth application on the host, with links into the host's settings built from `baseUrl`. */
export function SetupGuide({
  type,
  baseUrl,
}: {
  type: GitProviderType
  baseUrl: string
}) {
  const { variants } = setupGuides[type]
  return (
    <section className="flex flex-col gap-2">
      <SectionHeading>Register the OAuth app on the host</SectionHeading>
      {variants.map((variant, index) => (
        <Collapsible
          key={variant.key}
          defaultOpen={index === 0}
          className="flex flex-col gap-2"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="justify-between [&[data-state=open]>svg]:rotate-180"
            >
              {variant.title}
              <ChevronDown />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <VariantSteps variant={variant} baseUrl={baseUrl} />
          </CollapsibleContent>
        </Collapsible>
      ))}
    </section>
  )
}
