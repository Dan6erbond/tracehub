import { execFile } from 'node:child_process'
import { projectRoot } from './paths'

/** Runs a Node script from the project root; a failure carries the script's output. */
export const runNode = (
  script: string,
  args: ReadonlyArray<string>,
  env: NodeJS.ProcessEnv = {},
) =>
  new Promise<string>((resolve, reject) => {
    execFile(
      process.execPath,
      [script, ...args],
      {
        cwd: projectRoot,
        env: { ...process.env, ...env },
        maxBuffer: 64 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error)
          reject(
            new Error(
              `${script} ${args.join(' ')} failed\n${stdout}\n${stderr}`,
            ),
          )
        else resolve(stdout)
      },
    )
  })
