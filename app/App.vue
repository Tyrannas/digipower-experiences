<template>
  <VApp>
    <VAppBar app flat dense color="white" class="offline-bar">
      <a v-if="current" href="#" class="text-decoration-none mr-3">← {{ t('back') }}</a>
      <VToolbarTitle class="text-subtitle-1">
        {{ current ? current.config.title : t('title') }}
      </VToolbarTitle>
      <VSpacer />
      <VChip
        small
        :color="networkOk ? 'green' : 'red'"
        text-color="white"
        :title="networkDetails"
        data-testid="network-badge"
      >
        {{ networkOk ? t('offlineOk') : t('offlineKo', { n: external.length + blocked.length }) }}
      </VChip>
    </VAppBar>
    <VMain>
      <VContainer v-if="!slug" class="py-8" style="max-width: 960px">
        <p class="text-body-1">{{ t('intro') }}</p>
        <VRow>
          <VCol v-for="e in catalogue" :key="e.slug" cols="6" sm="4" md="3">
            <VCard :href="`#${e.slug}`" outlined class="pa-3 text-center fill-height" :data-testid="`exp-${e.slug}`">
              <img v-if="e.icon" :src="e.icon" alt="" height="48">
              <div class="mt-2 text-body-2">{{ e.title }}</div>
            </VCard>
          </VCol>
        </VRow>
        <p v-if="loadingCatalogue" class="text-caption">{{ t('loading') }}</p>
      </VContainer>
      <div v-else-if="current">
        <TheDataExperience :key="slug" :experience-module="current" :site-config="siteConfig" />
      </div>
      <VContainer v-else-if="loadError">
        <VAlert type="error">{{ loadError }}</VAlert>
      </VContainer>
    </VMain>
  </VApp>
</template>

<script>
// Every folder experiences/<name>/ with a src/index.ts is an experience,
// compiled into a lazily loaded chunk: no registration needed here.
// (import.meta.webpackContext, not require.context: this package is an ES module)
const experienceFiles = import.meta.webpackContext('../experiences', {
  recursive: true,
  regExp: /^\.\/[^/]+\/src\/index\.ts$/,
  mode: 'lazy'
})
const experienceLoaders = Object.fromEntries(
  experienceFiles.keys().map(key => [key.split('/')[1], () => experienceFiles(key)])
)

async function loadExperience(slug) {
  const load = experienceLoaders[slug]
  return load && (await load()).default
}

const texts = {
  en: {
    title: 'Data experiences',
    back: 'All experiences',
    intro: 'Choose the platform your data export comes from. Everything runs on this computer: you can disconnect from the internet.',
    loading: 'Loading…',
    offlineOk: 'No external request',
    offlineKo: '{n} external request(s)!',
    notFound: 'Unknown experience: {slug}'
  },
  fr: {
    title: 'Expériences de données',
    back: 'Toutes les expériences',
    intro: 'Choisissez la plateforme d’où vient votre export. Tout se passe sur cet ordinateur : vous pouvez vous déconnecter d’internet.',
    loading: 'Chargement…',
    offlineOk: 'Aucune requête externe',
    offlineKo: '{n} requête(s) externe(s) !',
    notFound: 'Expérience inconnue : {slug}'
  }
}

export default {
  name: 'OfflineApp',
  data() {
    return {
      slug: '',
      current: null,
      loadError: '',
      catalogue: [],
      loadingCatalogue: true,
      external: [],
      blocked: [],
      siteConfig: {
        i18nLocales: ['fr', 'en'],
        theme: { primary: '#0C2D48', secondary: '#2E8BC0' }
      }
    }
  },
  computed: {
    networkOk() {
      return this.external.length === 0 && this.blocked.length === 0
    },
    networkDetails() {
      return [...this.external, ...this.blocked.map(b => `blocked: ${b}`)].join('\n') || location.origin
    }
  },
  created() {
    this.watchNetwork()
    window.addEventListener('hashchange', this.route)
    this.route()
    this.buildCatalogue()
  },
  methods: {
    t(key, params = {}) {
      const lang = this.$i18n?.locale === 'en' ? 'en' : 'fr'
      return texts[lang][key].replace(/\{(\w+)\}/g, (_, p) => params[p])
    },
    async route() {
      this.slug = decodeURIComponent(location.hash.slice(1))
      this.current = null
      this.loadError = ''
      if (!this.slug) {
        return
      }
      const experience = await loadExperience(this.slug)
      if (experience) {
        this.current = experience
      } else {
        this.loadError = this.t('notFound', { slug: this.slug })
      }
    },
    async buildCatalogue() {
      const slugs = Object.keys(experienceLoaders)
      const loaded = await Promise.all(slugs.map(loadExperience))
      this.catalogue = loaded
        .filter(e => e && !e.config.slug.endsWith('-agg'))
        .map(e => ({ slug: e.config.slug, title: e.config.title, icon: e.config.icon }))
        .sort((a, b) => a.title.localeCompare(b.title))
      this.loadingCatalogue = false
    },
    // Shows, in the top bar, any resource loaded from another origin and any
    // request the Content-Security-Policy blocked. Both lists should stay empty.
    watchNetwork() {
      const record = (entry) => {
        if (!entry.name.startsWith(location.origin) && !/^(data|blob):/.test(entry.name)) {
          this.external.push(entry.name)
        }
      }
      if (window.PerformanceObserver) {
        new PerformanceObserver(list => list.getEntries().forEach(record))
          .observe({ type: 'resource', buffered: true })
      }
      document.addEventListener('securitypolicyviolation', (e) => {
        this.blocked.push(`${e.violatedDirective} ${e.blockedURI}`)
      })
    }
  }
}
</script>

<style>
.offline-bar { border-bottom: 1px solid #e0e0e0 !important; }
</style>
