// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      'nota-legacy/**',
      'webview-ui/**',
      'dist/**',
    ],
  },
  {
    rules: {
      // overrides
    },
  },
)
