import { defineExtension } from 'reactive-vscode'
import { window } from 'vscode'
import { MarkdownEditorProvider } from './editor/MarkdownEditorProvider'
import { initLogger, log } from './utils/logger'

const { activate, deactivate } = defineExtension((context) => {
  // Initialize logger first
  initLogger(context, 'Nota')
  log.info('Nota extension activating')

  // Register custom markdown editor
  const provider = new MarkdownEditorProvider(context)

  context.subscriptions.push(
    window.registerCustomEditorProvider(
      MarkdownEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  )

  log.info('Nota extension activated')
})

export { activate, deactivate }
