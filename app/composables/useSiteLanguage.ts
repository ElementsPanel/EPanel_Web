import { getDocsLanguage, isDocsLanguage } from '#shared/utils/docs'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function getRouteLanguage(path: string): DocsLanguage | null {
  if (!path.startsWith('/docs')) return null

  return getDocsLanguage(path.replace(/^\/docs\/?/, ''))
}

export function useSiteLanguage() {
  const route = useRoute()
  const legacyDocsLanguage = useCookie<DocsLanguage | null>('docs-language')
  const languageCookie = useCookie<DocsLanguage>('site-language', {
    default: () => isDocsLanguage(legacyDocsLanguage.value) ? legacyDocsLanguage.value : 'zh',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
  })

  const routeLanguage = getRouteLanguage(route.path)
  const language = useState<DocsLanguage>('site-language', () => routeLanguage
    ?? (isDocsLanguage(languageCookie.value) ? languageCookie.value : 'zh'))

  // 直接打开带语言的文档深链时，URL 是该次访问的明确语言选择。
  if (routeLanguage) {
    language.value = routeLanguage
    if (languageCookie.value !== routeLanguage) {
      languageCookie.value = routeLanguage
    }
  }

  function setLanguage(value: DocsLanguage): void {
    language.value = value
    languageCookie.value = value
  }

  function toggleLanguage(): void {
    setLanguage(language.value === 'zh' ? 'en' : 'zh')
  }

  return {
    language: readonly(language),
    setLanguage,
    toggleLanguage,
  }
}
