import { execFile } from 'node:child_process'
import { access, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { getDocsConfig, type DocsConfig } from './config'

const GIT_TIMEOUT = 120_000
const GIT_MAX_BUFFER = 8 * 1024 * 1024

type ExecFileAsync = (
  file: string,
  args: string[],
  options: { timeout: number, maxBuffer: number, encoding: BufferEncoding },
) => Promise<{ stdout: string, stderr: string }>

// promisify cannot infer execFile's overloads, so narrow the signature explicitly
const execFileAsync = promisify(execFile) as unknown as ExecFileAsync

async function git(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      timeout: GIT_TIMEOUT,
      maxBuffer: GIT_MAX_BUFFER,
      encoding: 'utf8',
    })
    return stdout.trim()
  }
  catch (error) {
    const err = error as NodeJS.ErrnoException & { stderr?: string }
    if (err.code === 'ENOENT') {
      throw createError({
        statusCode: 500,
        statusMessage: 'DocsSyncGitMissing',
        message: '拉取文档需要运行环境安装 git，并未在 PATH 中找到 git。',
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'DocsSyncFailed',
      message: `git ${args[0]} 执行失败：${(err.stderr || err.message || '').trim()}`,
    })
  }
}

async function hasGitRepo(dir: string): Promise<boolean> {
  try {
    await access(join(dir, '.git'))
    return true
  }
  catch {
    return false
  }
}

/** Current HEAD, or null when the repo is missing or unusable */
export async function readHead(config: DocsConfig): Promise<string | null> {
  try {
    return await git(['-C', config.dir, 'rev-parse', 'HEAD'])
  }
  catch {
    return null
  }
}

/** ISO time of the HEAD commit */
export async function readHeadDate(config: DocsConfig): Promise<string | null> {
  try {
    return await git(['-C', config.dir, 'log', '-1', '--format=%cI']) || null
  }
  catch {
    return null
  }
}

/**
 * A GitHub wiki may default to master or main, so try the configured
 * branch first, then fall back to master/main.
 */
function branchCandidates(branch: string): string[] {
  return [...new Set([branch, 'master', 'main'])].filter(Boolean)
}

async function cloneRepo(config: DocsConfig): Promise<void> {
  let failure: unknown

  for (const branch of branchCandidates(config.branch)) {
    try {
      await git([
        'clone',
        '--depth', '1',
        '--single-branch',
        '--branch', branch,
        '--',
        config.repo,
        config.dir,
      ])
      return
    }
    catch (error) {
      // Remove the half-cloned directory, otherwise the next run sees it as ready
      await rm(config.dir, { recursive: true, force: true })
      failure = error
    }
  }

  throw failure ?? createError({
    statusCode: 500,
    statusMessage: 'DocsSyncFailed',
    message: `无法从 ${config.repo} 克隆文档仓库。`,
  })
}

async function pullRepo(config: DocsConfig): Promise<void> {
  const currentRemote = await git(['-C', config.dir, 'remote', 'get-url', 'origin']).catch(() => '')
  if (currentRemote !== config.repo) {
    await git(['-C', config.dir, 'remote', 'set-url', 'origin', config.repo])
  }

  // The clone may have fallen back to main when master was missing, so trust
  // the branch actually checked out — otherwise every sync hits a missing branch.
  const branch = await git(['-C', config.dir, 'rev-parse', '--abbrev-ref', 'HEAD']).catch(() => '')
  const tracked = branch && branch !== 'HEAD' ? branch : config.branch

  // A --depth 1 shallow clone only carries one branch, so track that one as well
  await git(['-C', config.dir, 'fetch', '--depth', '1', 'origin', tracked])
  // The local mirror is read-only; reset --hard makes it match the remote exactly,
  // so files deleted upstream disappear too instead of lingering.
  await git(['-C', config.dir, 'reset', '--hard', `origin/${tracked}`])
}

export interface SyncResult {
  updated: boolean
  head: string
}

// Scheduled syncs can overlap with the first warm-up; one promise keeps them serial
let inFlight: Promise<SyncResult> | null = null

export function syncWiki(): Promise<SyncResult> {
  inFlight ??= performSync().finally(() => {
    inFlight = null
  })

  return inFlight
}

async function performSync(): Promise<SyncResult> {
  const config = getDocsConfig()
  const headBefore = await readHead(config)

  if (await hasGitRepo(config.dir)) {
    await pullRepo(config)
  }
  else {
    await mkdir(dirname(config.dir), { recursive: true })
    await cloneRepo(config)
  }

  const headAfter = await readHead(config)

  return {
    updated: headAfter !== null && headAfter !== headBefore,
    head: headAfter ?? '',
  }
}

/** A request arrived before the repo was cloned — clone once up front */
export async function ensureRepoReady(): Promise<void> {
  const config = getDocsConfig()
  if (await hasGitRepo(config.dir)) return

  await syncWiki()
}
