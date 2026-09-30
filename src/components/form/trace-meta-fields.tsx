import { TRACE_STATUS_OPTIONS } from '#/components/trace-status-badge'
import { withFieldGroup } from './use-app-form'
import type { TraceUploadItem } from '#/lib/schemas/create-run-form'

const defaultValues: Pick<TraceUploadItem, 'title' | 'status'> = {
  title: '',
  status: 'unknown',
}

/** Name and status of one trace, mapped onto an item of the `traces` array. */
export const TraceMetaFields = withFieldGroup({
  defaultValues,
  render: ({ group }) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <group.AppField name="title">
        {(field) => <field.TextField label="Name" />}
      </group.AppField>
      <group.AppField name="status">
        {(field) => (
          <field.SelectField label="Status" options={TRACE_STATUS_OPTIONS} />
        )}
      </group.AppField>
    </div>
  ),
})
