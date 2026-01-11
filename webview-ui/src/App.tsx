import type { ChangeEvent, FC } from 'react'
import type { ExtensionMessage } from '@/vscode'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { log } from '@/lib/logger'
import {
  getEditorState,
  isVSCode,
  onExtensionMessage,
  saveEditorState,
  sendContentChange,
  sendReady,
} from '@/vscode'

const DEV_CONTENT = `# Welcome to Nota

This is a **markdown** editor running in development mode.

## Features
- Simple textarea-based editing
- Syncs with VS Code extension
- Persists state across tab switches

\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

Edit this content to test the editor.
`

// Get initial state synchronously before render
function getInitialState(): { content: string, isInitialized: boolean } {
  // Try to restore from webview state first
  const savedState = getEditorState()
  if (savedState?.content) {
    log.debug('Restored state from webview memory', { length: savedState.content.length })
    return { content: savedState.content, isInitialized: true }
  }

  // In dev mode, use placeholder content
  if (!isVSCode) {
    log.debug('Dev mode: using placeholder content')
    return { content: DEV_CONTENT, isInitialized: true }
  }

  // In VS Code, wait for init message
  log.debug('VS Code mode: waiting for init message')
  return { content: '', isInitialized: false }
}

export const App: FC = () => {
  const initialState = useMemo(() => getInitialState(), [])
  const [content, setContent] = useState<string>(initialState.content)
  const [isInitialized, setIsInitialized] = useState(initialState.isInitialized)

  // Track if we're receiving an update to avoid echo
  const isReceivingUpdate = useRef(false)

  // Handle messages from extension
  const handleExtensionMessage = useCallback((message: ExtensionMessage): void => {
    log.info('Received message from extension', { type: message.type, contentLength: message.content.length })

    if (message.type === 'init' || message.type === 'update') {
      isReceivingUpdate.current = true
      setContent(message.content)
      saveEditorState({ content: message.content })
      setIsInitialized(true)

      // Reset flag after state update
      requestAnimationFrame(() => {
        isReceivingUpdate.current = false
      })
    }
  }, [])

  // Set up message listener and notify extension we're ready
  useEffect(() => {
    log.info('App mounted, setting up message listener')

    const unsubscribe = onExtensionMessage(handleExtensionMessage)

    // Tell extension we're ready to receive content
    if (isVSCode) {
      log.info('Sending ready signal to extension')
      sendReady()
    }

    return () => {
      log.debug('App unmounting, cleaning up')
      unsubscribe()
    }
  }, [handleExtensionMessage])

  // Handle user input
  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>): void => {
    const newContent = e.target.value
    setContent(newContent)
    saveEditorState({ content: newContent })

    // Only send to extension if not receiving an update (avoid loops)
    if (!isReceivingUpdate.current) {
      log.debug('Sending content change to extension', { length: newContent.length })
      sendContentChange(newContent)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <span className="text-sm text-muted-foreground">
          {isVSCode ? 'Nota Editor' : 'Development Mode'}
        </span>
        <span className="text-xs text-muted-foreground">
          {content.length}
          {' '}
          characters
        </span>
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={handleChange}
        className="flex-1 w-full p-4 bg-background text-foreground font-mono text-sm resize-none focus:outline-none"
        placeholder={isInitialized ? '' : 'Loading...'}
        spellCheck={false}
      />
    </div>
  )
}
