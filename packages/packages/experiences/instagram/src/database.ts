import type { DatabaseConfig } from '@/types'
import { SQLType, JSONPathRecord } from '@/types/database-config'
import { toDateString, SUPPORTED_LOCALE } from '@/utils'

const { TEXT } = SQLType

// --- Helpers for the new export format -------------------------------------
// New "viewed/liked" files (posts_viewed, videos_watched, ads_viewed,
// liked_posts) are bare arrays of entries shaped like:
//   { timestamp: <unix seconds>, label_values: [ ..., { title: 'Propriétaire',
//     dict: [ { dict: [ { label: 'Nom de profil', value: '<account>' }, ... ] } ] } ] }
// Label text is matched on the *decoded* French strings: the facebook/src
// preprocessor must repair the double-encoded UTF-8 (PropriÃ©taire -> Propriétaire)
// before these getters run.

// Depth-first search for the first { label, value } whose label matches, following
// only nested `dict` arrays. Story-reaction stickers wrap the owner one level deeper
// than posts/videos/likes, so a recursive search handles every variant.
const deepFindLabel = (node: any, label: string): string => {
  if (Array.isArray(node)) {
    for (const x of node) {
      const r = deepFindLabel(x, label)
      if (r) return r
    }
    return ''
  }
  if (node && typeof node === 'object') {
    if (node.label === label && node.value) return node.value
    if (Array.isArray(node.dict)) return deepFindLabel(node.dict, label)
  }
  return ''
}

// Pull the account handle out of the "Propriétaire" owner block of a label_values list.
// Exports are localized per file, so accept both the French and English labels.
const OWNER_TITLES = ['Propriétaire', 'Owner']
const PROFILE_LABELS = ['Nom de profil', 'Username']
// The owner block is usually top-level, but reposts nest it under
// "Contenu multimédia", so search the dict tree for the first owner block.
const findOwner = (node: any): any => {
  if (Array.isArray(node)) {
    for (const x of node) {
      const r = findOwner(x)
      if (r) return r
    }
    return null
  }
  if (node && typeof node === 'object') {
    if (OWNER_TITLES.includes(node.title) && Array.isArray(node.dict))
      return node
    if (Array.isArray(node.dict)) return findOwner(node.dict)
  }
  return null
}
const ownerProfileName = (labelValues: any[]): string => {
  const owner = findOwner(labelValues || [])
  if (!owner) return ''
  for (const label of PROFILE_LABELS) {
    const v = deepFindLabel(owner, label)
    if (v) return v
  }
  return ''
}

// Callback shared by every label_values-based "viewed/liked" file: derive the
// account name and a formatted date from the top-level unix `timestamp`.
// (Old code parsed fragile localized date strings; the new format is numeric.)
const labelValuesCallback = (output: unknown) => {
  const o = output as JSONPathRecord
  const lv: any[] = (o['label_values'] as any[]) || []
  o['accountName'] = ownerProfileName(lv)
  o['date'] = toDateString(String(o['timestamp']), '%s', SUPPORTED_LOCALE.FR)
}

// Variant of labelValuesCallback that also tags the row with a constant `kind`,
// so several files (story likes/polls/reactions) can share one table and the SQL
// needs a single UNION rather than one per file.
const labelValuesKind = (kind: string) => (output: unknown) => {
  labelValuesCallback(output)
  ;(output as JSONPathRecord)['kind'] = kind
}

// Callback for the older `string_map_data` files (threads, comments, logins) that
// still nest the unix time under a `Time`/`Heure` key. Formats it like the rest.
const stringMapDateCallback = (timeKey: string) => (output: unknown) => {
  const o = output as JSONPathRecord
  const ts = (o[timeKey] as any)?.timestamp
  o['date'] = toDateString(String(ts), '%s', SUPPORTED_LOCALE.FR)
}

// Value (or timestamp) of the first present key among localized variants,
// e.g. smdValue(o, ['Adresse IP', 'IP Address']).
const smdValue = (o: any, keys: string[], field = 'value'): any => {
  for (const k of keys) {
    const v = o?.[k]?.[field]
    if (v !== undefined && v !== '') return v
  }
  return undefined
}

// Group the free-text "categories used to reach you" into a few themes so the
// interests chart shows a meaningful breakdown. Labels mix French and English.
const INTEREST_THEMES: [string, RegExp][] = [
  ['Friends & family of', /^(friends of|amis? d|famille d|parents? d)/i],
  [
    'Devices & network',
    /(access \(|accès|mobile|smartphone|tablet|tablette|android|ios|iphone|wi-?fi|réseau|network|appareil|device|navigateur|browser)/i
  ],
  ['Page admins', /(page admin|administrat)/i],
  ['Travel', /(travel|voyag|touris)/i],
  [
    'Life events & demographics',
    /(birthday|anniversaire|away from|loin d|relationship|situation amoureuse|single|célibataire|married|mari[ée]|engaged|fiancé|moved|déménag|expat|abroad|étranger|parent|newlywed|graduat|diplôm|lives? in|habite)/i
  ]
]
const interestTheme = (title: string): string =>
  INTEREST_THEMES.find(([, re]) => re.test(title))?.[0] ??
  'Interests & behaviours'

const config: DatabaseConfig = {
  tables: [
    {
      name: 'InstagramMessage',
      columns: [
        ['senderName', TEXT],
        ['timestampMs', TEXT],
        ['messageContent', TEXT]
      ]
    },
    {
      name: 'InstagramFollower',
      columns: [
        ['accountName', TEXT],
        ['timestampMs', TEXT],
        ['accountUrl', TEXT]
      ]
    },
    {
      name: 'InstagramFollowing',
      columns: [
        ['accountName', TEXT],
        ['timestampMs', TEXT],
        ['accountUrl', TEXT]
      ]
    },
    {
      name: 'InstagramPostViewed',
      columns: [
        ['accountName', TEXT],
        ['datetime', TEXT]
      ]
    },
    {
      name: 'InstagramVideoWatched',
      columns: [
        ['accountName', TEXT],
        ['datetime', TEXT]
      ]
    },
    {
      name: 'InstagramAdViewed',
      columns: [
        ['accountName', TEXT],
        ['datetime', TEXT]
      ]
    },
    {
      name: 'InstagramCommentLiked',
      columns: [
        ['accountName', TEXT],
        ['unixTimestamp', TEXT]
      ]
    },
    {
      name: 'InstagramPostLiked',
      columns: [
        ['accountName', TEXT],
        ['datetime', TEXT]
      ]
    },
    {
      name: 'InstagramAdvertiser',
      columns: [['advertiserName', TEXT]]
    },
    {
      name: 'InstagramAdInterest',
      columns: [
        ['title', TEXT],
        ['theme', TEXT]
      ]
    },
    {
      name: 'InstagramInfo',
      columns: [['name', TEXT]]
    },
    {
      name: 'InstagramThreadViewed',
      columns: [
        ['accountName', TEXT],
        ['datetime', TEXT]
      ]
    },
    {
      name: 'InstagramComment',
      columns: [
        ['accountName', TEXT],
        ['datetime', TEXT]
      ]
    },
    {
      name: 'InstagramStoryInteraction',
      columns: [
        ['accountName', TEXT],
        ['datetime', TEXT],
        ['kind', TEXT]
      ]
    },
    {
      name: 'InstagramStoryViewed',
      columns: [
        ['accountName', TEXT],
        ['datetime', TEXT]
      ]
    },
    {
      name: 'InstagramRepost',
      columns: [
        ['accountName', TEXT],
        ['datetime', TEXT]
      ]
    },
    {
      name: 'InstagramSaved',
      columns: [
        ['accountName', TEXT],
        ['datetime', TEXT]
      ]
    },
    {
      name: 'InstagramLocation',
      columns: [['location', TEXT]]
    },
    {
      name: 'InstagramLogin',
      columns: [
        ['ipAddress', TEXT],
        ['datetime', TEXT],
        ['userAgent', TEXT]
      ]
    }
  ],
  getters: [
    {
      // Bucket C: rebuilt from other_categories_used_to_reach_you.
      // New shape: { label_values: [ { label, vec: [ { value } ] } ] }
      fileId: 'adsInterests',
      path: '$.label_values[*].vec[*]',
      table: 'InstagramAdInterest',
      options: {
        callback: output => {
          const o = output as JSONPathRecord
          o['theme'] = interestTheme(String(o['value'] ?? '').trim())
        }
      },
      getters: [
        {
          column: 'title',
          path: '$.value'
        },
        {
          column: 'theme',
          path: '$.theme'
        }
      ]
    },
    {
      // Messages' sender_name is the display name in some exports and the
      // handle in others, so store both (one row each); the SQL uses IN (...).
      // Keys are localized: Nom/Name, Nom de profil/Username.
      fileId: 'personalInfos',
      path: '$.profile_user[*].string_map_data',
      table: 'InstagramInfo',
      options: {
        callback: output => {
          const o = output as JSONPathRecord
          o['_displayName'] = smdValue(o, ['Nom', 'Name']) ?? ''
        }
      },
      getters: [{ column: 'name', path: '$._displayName' }]
    },
    {
      fileId: 'personalInfos',
      path: '$.profile_user[*].string_map_data',
      table: 'InstagramInfo',
      options: {
        callback: output => {
          const o = output as JSONPathRecord
          o['_handle'] =
            smdValue(o, ['Nom de profil', 'Username', "Nom d'utilisateur"]) ??
            ''
        }
      },
      getters: [{ column: 'name', path: '$._handle' }]
    },
    {
      // Bucket D: single object whose label_values carry vec lists of advertiser
      // names. The old boolean audience-type columns no longer exist.
      fileId: 'advertisers',
      path: '$.label_values[*].vec[*]',
      table: 'InstagramAdvertiser',
      getters: [
        {
          column: 'advertiserName',
          path: '$.value'
        }
      ]
    },
    {
      fileId: 'messages',
      path: '$.messages[*]',
      table: 'InstagramMessage',
      getters: [
        {
          column: 'senderName',
          path: '$.sender_name'
        },
        {
          column: 'timestampMs',
          path: '$.timestamp_ms'
        },
        {
          column: 'messageContent',
          path: '$.content'
        }
      ]
    },
    {
      // Pattern B: followers_1.json lost the `relationships_followers` wrapper
      // and is now a bare array. string_list_data[0] still has value/timestamp/href.
      fileId: 'followers',
      path: '$[*].string_list_data[0]',
      table: 'InstagramFollower',
      getters: [
        {
          column: 'accountName',
          path: '$.value'
        },
        {
          column: 'timestampMs',
          path: '$.timestamp'
        },
        {
          column: 'accountUrl',
          path: '$.href'
        }
      ]
    },
    {
      // Pattern B: wrapper kept, but string_list_data no longer has `value`.
      // The username is now in the entry's `title`.
      fileId: 'followings',
      path: '$.relationships_following[*]',
      table: 'InstagramFollowing',
      getters: [
        {
          column: 'accountName',
          path: '$.title'
        },
        {
          column: 'timestampMs',
          path: '$.string_list_data[0].timestamp'
        },
        {
          column: 'accountUrl',
          path: '$.string_list_data[0].href'
        }
      ]
    },
    {
      // Pattern A: bare array; account in label_values, date from unix timestamp.
      fileId: 'postsViewed',
      path: '$[*]',
      table: 'InstagramPostViewed',
      options: { callback: labelValuesCallback },
      getters: [
        { column: 'accountName', path: 'accountName' },
        { column: 'datetime', path: 'date' }
      ]
    },
    {
      // Pattern A: same shape as postsViewed.
      fileId: 'videosWatched',
      path: '$[*]',
      table: 'InstagramVideoWatched',
      options: { callback: labelValuesCallback },
      getters: [
        { column: 'accountName', path: 'accountName' },
        { column: 'datetime', path: 'date' }
      ]
    },
    {
      // Pattern A: bare array, same shape as postsViewed.
      fileId: 'adsViewed',
      path: '$[*]',
      table: 'InstagramAdViewed',
      options: { callback: labelValuesCallback },
      getters: [
        { column: 'accountName', path: 'accountName' },
        { column: 'datetime', path: 'date' }
      ]
    },
    {
      // Pattern B: wrapper kept; username in `title`, emoji kept in
      // string_list_data[0].value, timestamp in string_list_data[0].timestamp.
      fileId: 'likedComments',
      path: '$.likes_comment_likes[*]',
      table: 'InstagramCommentLiked',
      getters: [
        {
          column: 'accountName',
          path: '$.title'
        },
        {
          column: 'unixTimestamp',
          path: '$.string_list_data[0].timestamp'
        }
      ]
    },
    {
      // Pattern A: bare array; liked account in the Propriétaire owner block,
      // date from the top-level unix timestamp.
      fileId: 'likedPosts',
      path: '$[*]',
      table: 'InstagramPostLiked',
      options: { callback: labelValuesCallback },
      getters: [
        { column: 'accountName', path: 'accountName' },
        { column: 'datetime', path: 'date' }
      ]
    },
    {
      // Threads (text app) content viewed — old-style string_map_data, but Time
      // is now a numeric timestamp. Same Author/Time pair as posts/videos viewed.
      fileId: 'threadsViewed',
      path: '$.text_post_app_text_post_app_posts_seen[*].string_map_data',
      table: 'InstagramThreadViewed',
      options: { callback: stringMapDateCallback('Time') },
      getters: [
        { column: 'accountName', path: '$.Author.value' },
        { column: 'datetime', path: 'date' }
      ]
    },
    {
      // Comments you posted: bare array of string_map_data entries.
      // Account = the post's "Media Owner".
      fileId: 'comments',
      path: '$[*].string_map_data',
      table: 'InstagramComment',
      options: { callback: stringMapDateCallback('Time') },
      getters: [
        { column: 'accountName', path: "$['Media Owner'].value" },
        { column: 'datetime', path: 'date' }
      ]
    },
    {
      // Comments on reels: same entries as post comments, inside a wrapper.
      fileId: 'reelsComments',
      path: '$.comments_reels_comments[*].string_map_data',
      table: 'InstagramComment',
      options: { callback: stringMapDateCallback('Time') },
      getters: [
        { column: 'accountName', path: "$['Media Owner'].value" },
        { column: 'datetime', path: 'date' }
      ]
    },
    {
      // Stories viewed — same shape as posts viewed.
      fileId: 'storiesViewed',
      path: '$[*]',
      table: 'InstagramStoryViewed',
      options: { callback: labelValuesCallback },
      getters: [
        { column: 'accountName', path: 'accountName' },
        { column: 'datetime', path: 'date' }
      ]
    },
    {
      // Reposts (new feature): the reposted account sits under
      // "Contenu multimédia" > "Propriétaire"; findOwner handles the nesting.
      fileId: 'reposts',
      path: '$[*]',
      table: 'InstagramRepost',
      options: { callback: labelValuesCallback },
      getters: [
        { column: 'accountName', path: 'accountName' },
        { column: 'datetime', path: 'date' }
      ]
    },
    {
      // Story likes — label_values + Propriétaire owner, like posts viewed.
      fileId: 'storyLikes',
      path: '$[*]',
      table: 'InstagramStoryInteraction',
      options: { callback: labelValuesKind('Story Like') },
      getters: [
        { column: 'accountName', path: 'accountName' },
        { column: 'datetime', path: 'date' },
        { column: 'kind', path: 'kind' }
      ]
    },
    {
      // Poll votes on stories — same owner/timestamp shape.
      fileId: 'polls',
      path: '$[*]',
      table: 'InstagramStoryInteraction',
      options: { callback: labelValuesKind('Poll Vote') },
      getters: [
        { column: 'accountName', path: 'accountName' },
        { column: 'datetime', path: 'date' },
        { column: 'kind', path: 'kind' }
      ]
    },
    {
      // Story emoji reactions — bare array, like the other label_values files.
      fileId: 'storyReactions',
      path: '$[*]',
      table: 'InstagramStoryInteraction',
      options: { callback: labelValuesKind('Story Reaction') },
      getters: [
        { column: 'accountName', path: 'accountName' },
        { column: 'datetime', path: 'date' },
        { column: 'kind', path: 'kind' }
      ]
    },
    {
      // Saved posts — label_values + Propriétaire owner.
      fileId: 'saved',
      path: '$[*]',
      table: 'InstagramSaved',
      options: { callback: labelValuesCallback },
      getters: [
        { column: 'accountName', path: 'accountName' },
        { column: 'datetime', path: 'date' }
      ]
    },
    {
      // Locations of interest — a vec list of coarse place names.
      fileId: 'locationsOfInterest',
      path: '$.label_values[*].vec[*]',
      table: 'InstagramLocation',
      getters: [{ column: 'location', path: '$.value' }]
    },
    {
      // Home location, shape 1: { inferred_data_primary_location: [ {
      //   string_map_data: { 'Nom de la ville': { value } } } ] }
      fileId: 'profileBasedIn',
      path: '$.inferred_data_primary_location[*].string_map_data',
      table: 'InstagramLocation',
      options: {
        callback: output => {
          const o = output as JSONPathRecord
          o['_city'] =
            smdValue(o, ['Nom de la ville', 'City name', 'City']) ?? ''
        }
      },
      getters: [{ column: 'location', path: '$._city' }]
    },
    {
      // Home location, shape 2: { label_values: [ { label: 'Lieu', dict: [
      //   { label: 'Pays' }, { label: 'Région' }, { label: 'Ville', value } ] } ] }
      fileId: 'profileBasedIn',
      path: '$.label_values[?(@.dict)]',
      table: 'InstagramLocation',
      options: {
        callback: output => {
          const o = output as JSONPathRecord
          const dict: any[] = (o['dict'] as any[]) || []
          o['_city'] =
            dict.find((x: any) => ['Ville', 'City'].includes(x.label))?.value ||
            ''
        }
      },
      getters: [{ column: 'location', path: '$._city' }]
    },
    {
      // Login history — IP + user agent + numeric login time. Keys are French
      // or English depending on the export.
      fileId: 'loginActivity',
      path: '$.account_history_login_history[*].string_map_data',
      table: 'InstagramLogin',
      options: {
        callback: output => {
          const o = output as JSONPathRecord
          const ts = smdValue(o, ['Heure', 'Time'], 'timestamp')
          o['_date'] = toDateString(String(ts), '%s', SUPPORTED_LOCALE.FR)
          o['_ip'] = smdValue(o, ['Adresse IP', 'IP Address']) ?? ''
          o['_ua'] = smdValue(o, ['Agent utilisateur', 'User Agent']) ?? ''
        }
      },
      getters: [
        { column: 'ipAddress', path: '$._ip' },
        { column: 'datetime', path: '$._date' },
        { column: 'userAgent', path: '$._ua' }
      ]
    }
  ]
}

export default config
