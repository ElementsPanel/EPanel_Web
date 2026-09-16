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

// promisify 无法正确推导 execFile 的 overload，这里显式收缩签名
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

/** 返回当前 HEAD，仓库不存在或不可用时返回 null */
export async function readHead(config: DocsConfig): Promise<string | null> {
  try {
    return await git(['-C', config.dir, 'rev-parse', 'HEAD'])
  }
  catch {
    return null
  }
}

/** 返回 HEAD 提交的 ISO 时间 */
export async function readHeadDate(config: DocsConfig): Promise<string | null> {
  try {
    return await git(['-C', config.dir, 'log', '-1', '--format=%cI']) || null
  }
  catch {
    return null
  }
}

/**
 * GitHub wiki 的默认分支可能是 master 也可能是 main，
 * 因此按「配置的分支优先，再退回 master/main」的顺序尝试。
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
      // 清理半成品目录，否则下次会被误判为「仓库已就绪」
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

  // clone 时可能因为 master 不存在而退回到 main 之类的分支，
  // 因此以本地实际检出的分支为准，否则每次定时拉取都会打到不存在的分支上。
  const branch = await git(['-C', config.dir, 'rev-parse', '--abbrev-ref', 'HEAD']).catch(() => '')
  const tracked = branch && branch !== 'HEAD' ? branch : config.branch

  // --depth 1 的浅克隆只保留单分支历史，这里同样只追踪这一个分支
  await git(['-C', config.dir, 'fetch', '--depth', '1', 'origin', tracked])
  // 本地镜像只读；reset --hard 让工作区与远端完全一致，
  // 上游删除的文件也会随之消失，不会产生残留。
  await git(['-C', config.dir, 'reset', '--hard', `origin/${tracked}`])
}

export interface SyncResult {
  /** 本次是否拉到了新的提交 */
  updated: boolean
  head: string
}

// 定时触发与首次预热可能重叠，用同一个 Promise 保证串行执行
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

/** 仓库尚未克隆就收到了请求时，先补齐一次克隆 */
export async function ensureRepoReady(): Promise<void> {
  const config = getDocsConfig()
  if (await hasGitRepo(config.dir)) return

  await syncWiki()
}
