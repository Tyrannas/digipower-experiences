import { PreprocessorFunction } from '@/types/experience-options'
import facebook from '../../facebook/src/preprocessor'

// "Activity" files (ads_viewed, posts_viewed, story_likes, quizzes...) are a bare
// array of { timestamp, media, label_values, fbid } entries, except when the
// export holds a single entry: Meta then writes the object without the array.
// Wrap that case so every getter can use `$[*]`.
const SINGLE_ACTIVITY_ENTRY = /^\s*\{\s*"timestamp"\s*:/

const instagram: PreprocessorFunction = input => {
  const s = facebook(input)
  return SINGLE_ACTIVITY_ENTRY.test(s) ? `[${s}]` : s
}

export default instagram
