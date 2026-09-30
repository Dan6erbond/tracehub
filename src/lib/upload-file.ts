import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod4'

const uploadResponseSchema = z.object({ storageId: zid('_storage') })

/** POSTs a file to a Convex upload URL; `fetch` has no upload progress, hence XHR. */
export function uploadFile(
  uploadUrl: string,
  file: File,
  onProgress: (fraction: number) => void,
) {
  return new Promise<z.infer<typeof uploadResponseSchema>['storageId']>(
    (resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open('POST', uploadUrl)
      request.setRequestHeader(
        'Content-Type',
        file.type || 'application/octet-stream',
      )
      request.upload.onprogress = ({ lengthComputable, loaded, total }) => {
        if (lengthComputable) onProgress(loaded / total)
      }
      request.onload = () => {
        if (request.status < 200 || request.status >= 300)
          return reject(new Error(`Upload failed (${request.status})`))
        resolve(
          uploadResponseSchema.parse(JSON.parse(request.responseText))
            .storageId,
        )
      }
      request.onerror = () => reject(new Error('Upload failed'))
      request.send(file)
    },
  )
}
