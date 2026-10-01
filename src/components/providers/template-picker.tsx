import { LinkCard } from '#/components/card-link'
import { StretchedLink } from '#/components/stretched-link'
import { CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { providerTemplates } from '#/lib/schemas/git-provider'

export function TemplatePicker() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {providerTemplates.map((template) => (
        <LinkCard key={template.key}>
          <CardHeader>
            <CardTitle>
              <StretchedLink
                to="/admin/providers/new"
                search={{ template: template.key }}
              >
                {template.label}
              </StretchedLink>
            </CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
        </LinkCard>
      ))}
    </div>
  )
}
