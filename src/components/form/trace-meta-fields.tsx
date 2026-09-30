import { TRACE_STATUS_OPTIONS } from '#/components/trace-status-badge'
import { withFieldGroup } from './use-app-form'
import type { TraceUploadItem } from '#/lib/schemas/create-run-form'

const defaultValues: Pick<TraceUploadItem, 'title' | 'status' | 'jobName'> = {
  title: '',
  status: 'unknown',
  jobName: '',
}

/** Name, status and pipeline job of one trace, mapped onto an item of the `traces` array. */
export const TraceMetaFields = withFieldGroup({
  defaultValues,
  render: ({ group }) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <group.AppField name="title">
          {(field) => <field.TextField label="Name" />}
        </group.AppField>
      </div>
      <group.AppField name="status">
        {(field) => (
          <field.SelectField label="Status" options={TRACE_STATUS_OPTIONS} />
        )}
      </group.AppField>
      <group.AppField name="jobName">
        {(field) => <field.TextField label="CI job" placeholder="Optional" />}
      </group.AppField>
    </div>
  ),
})
