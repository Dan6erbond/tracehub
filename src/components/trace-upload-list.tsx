import { X } from 'lucide-react'
import { createRunFormOptions } from '#/components/form/create-run-form-options'
import { TraceMetaFields } from '#/components/form/trace-meta-fields'
import { withForm } from '#/components/form/use-app-form'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { parseTraceZip } from '#/lib/parse-trace-zip'
import { formatBytes } from '#/lib/format'

const NO_PROGRESS: Record<number, number> = {}

/** Dropzone plus one editable row per dropped trace zip, bound to the form's `traces` array. */
export const TraceUploadList = withForm({
  ...createRunFormOptions,
  props: { progress: NO_PROGRESS },
  render: ({ form, progress }) => (
    <form.AppField name="traces" mode="array">
      {(field) => (
        <div className="flex flex-col gap-3">
          <field.DropzoneField
            accept={{ 'application/zip': ['.zip'] }}
            label="Drop Playwright trace zips here, or click to browse"
            hint="Name, status and duration are read from the zip"
            onFiles={(files) =>
              files.forEach((file) => {
                field.pushValue({
                  file,
                  title: file.name.replace(/\.zip$/i, ''),
                  status: 'unknown',
                })
                parseTraceZip(file)
                  .then(({ title, durationMs, status }) =>
                    field.setValue((items) =>
                      items.map((item) =>
                        item.file === file
                          ? {
                              ...item,
                              title: title ?? item.title,
                              status: status ?? item.status,
                              durationMs,
                            }
                          : item,
                      ),
                    ),
                  )
                  .catch(() => undefined)
              })
            }
          />
          {field.state.value.map(({ file }, index) => (
            <Card key={`${file.name}-${file.size}-${file.lastModified}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="truncate text-sm font-medium">
                  {file.name}{' '}
                  <span className="font-normal text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => field.removeValue(index)}
                >
                  <X />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <TraceMetaFields form={form} fields={`traces[${index}]`} />
                {index in progress && (
                  <Progress value={progress[index] * 100} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </form.AppField>
  ),
})
