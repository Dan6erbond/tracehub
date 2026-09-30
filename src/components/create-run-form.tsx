import { createRunFormOptions } from '#/components/form/create-run-form-options'
import { useAppForm } from '#/components/form/use-app-form'
import { TraceUploadList } from '#/components/trace-upload-list'
import { FieldGroup, FieldLegend, FieldSet } from '#/components/ui/field'
import { useSubmitTraces } from '#/hooks/use-submit-traces'
import type { Id } from '../../convex/_generated/dataModel'
import type { TraceTarget } from '#/hooks/use-trace-target'

/** Uploads trace zips into a new run for a branch or pull request, or into an existing run. */
export function CreateRunForm({
  repoId,
  target,
  onCreated,
}: {
  repoId: Id<'repos'>
  target: TraceTarget
  onCreated: (runId: Id<'runs'>) => void
}) {
  const { submit, progress } = useSubmitTraces(repoId, target)
  const form = useAppForm({
    ...createRunFormOptions,
    defaultValues: {
      ...createRunFormOptions.defaultValues,
      sha: target.kind === 'run' ? target.run.sha : target.sha,
    },
    onSubmit: async ({ value }) => onCreated(await submit.mutateAsync(value)),
  })

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        {target.kind !== 'run' && (
          <>
            <form.AppField name="sha">
              {(field) => (
                <field.TextField
                  label="Commit SHA"
                  description="The commit the traces were recorded against"
                />
              )}
            </form.AppField>
            <form.AppField name="title">
              {(field) => (
                <field.TextField
                  label="Title"
                  placeholder="Optional"
                  description="Names the run, e.g. for pinned feature traces"
                />
              )}
            </form.AppField>
            <form.AppField name="description">
              {(field) => (
                <field.TextareaField
                  label="Description"
                  placeholder="Optional"
                />
              )}
            </form.AppField>
            {target.kind === 'pull' && (
              <form.AppField name="pinned">
                {(field) => (
                  <field.SwitchField
                    label="Pin to pull request"
                    description="Shows this run above the CI runs on the pull request page"
                  />
                )}
              </form.AppField>
            )}
            <FieldSet>
              <FieldLegend variant="label">CI pipeline (optional)</FieldLegend>
              <FieldGroup>
                <form.AppField name="externalRunId">
                  {(field) => (
                    <field.TextField
                      label="Pipeline run ID"
                      description="Uploads with the same pipeline, job and commit share one run"
                    />
                  )}
                </form.AppField>
                <form.AppField name="externalJobId">
                  {(field) => (
                    <field.TextField
                      label="Job ID"
                      description="Links the run to that job of the Git host's CI"
                    />
                  )}
                </form.AppField>
                <form.AppField name="jobName">
                  {(field) => <field.TextField label="Job name" />}
                </form.AppField>
                <form.AppField name="ciUrl">
                  {(field) => <field.TextField label="Pipeline URL" />}
                </form.AppField>
              </FieldGroup>
            </FieldSet>
          </>
        )}
      </FieldGroup>
      <TraceUploadList form={form} progress={progress} />
      {submit.isError && (
        <p className="text-sm text-destructive">{submit.error.message}</p>
      )}
      <form.AppForm>
        <form.SubmitButton>Upload traces</form.SubmitButton>
      </form.AppForm>
    </form>
  )
}
