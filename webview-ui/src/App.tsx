import type { FC } from 'react'
import type { ExtensionMessage } from '@/vscode'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BlockNoteEditor } from '@/components/BlockNoteEditor'
import { log } from '@/lib/logger'
import {
  getEditorState,
  isVSCode,
  onExtensionMessage,
  saveEditorState,
  sendContentChange,
  sendReady,
} from '@/vscode'

// Detect theme and sync with our dark class
// In VS Code: use VS Code theme classes
// In dev mode: use system prefers-color-scheme
const useTheme = (): void => {
  useEffect(() => {
    const setDarkMode = (isDark: boolean): void => {
      if (isDark) {
        document.documentElement.classList.add('dark')
      }
      else {
        document.documentElement.classList.remove('dark')
      }
      log.debug('Theme updated', { isDark, isVSCode })
    }

    if (isVSCode) {
      // VS Code mode: watch for theme class changes on body
      const updateFromVSCode = (): void => {
        const isDark = document.body.classList.contains('vscode-dark')
          || document.body.classList.contains('vscode-high-contrast')
        setDarkMode(isDark)
      }

      updateFromVSCode()

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName === 'class') {
            updateFromVSCode()
          }
        }
      })

      observer.observe(document.body, { attributes: true })
      return () => observer.disconnect()
    }
    else {
      // Dev mode: use system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      setDarkMode(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent): void => {
        setDarkMode(e.matches)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])
}

const DEV_CONTENT = `# Welcome to Nota

This is a **markdown** editor running in development mode.

## Features
- Simple editing
- Syncs with VS Code extension
- Persists state across tab switches

\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

Edit this content to test the editor.
`

const getInitialState = (): { content: string, isInitialized: boolean } => {
  const savedState = getEditorState()
  if (savedState?.content) {
    log.debug('Restored state from webview memory', { length: savedState.content.length })
    return { content: savedState.content, isInitialized: true }
  }

  if (!isVSCode) {
    log.debug('Dev mode: using placeholder content')
    return { content: DEV_CONTENT, isInitialized: true }
  }

  log.debug('VS Code mode: waiting for init message')
  return { content: '', isInitialized: false }
}

export const App: FC = () => {
  useTheme()

  const initialState = useMemo(() => getInitialState(), [])
  const [content, setContent] = useState<string>(initialState.content)
  const [isInitialized, setIsInitialized] = useState(initialState.isInitialized)

  const isReceivingUpdate = useRef(false)
  const externalUpdateHandlerRef = useRef<((markdown: string) => Promise<void>) | null>(null)

  const handleExtensionMessage = useCallback((message: ExtensionMessage): void => {
    log.info('Received message from extension', { type: message.type, contentLength: message.content.length })

    if (message.type === 'init' || message.type === 'update') {
      isReceivingUpdate.current = true
      setContent(message.content)
      saveEditorState({ content: message.content })
      setIsInitialized(true)

      // Forward to BlockNote editor
      externalUpdateHandlerRef.current?.(message.content)

      requestAnimationFrame(() => {
        isReceivingUpdate.current = false
      })
    }
  }, [])

  useEffect(() => {
    log.info('App mounted, setting up message listener')

    const unsubscribe = onExtensionMessage(handleExtensionMessage)

    if (isVSCode) {
      log.info('Sending ready signal to extension')
      sendReady()
    }

    return () => {
      log.debug('App unmounting, cleaning up')
      unsubscribe()
    }
  }, [handleExtensionMessage])

  // ============ TEXTAREA HANDLERS ============
  // const handleTextareaChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>): void => {
  //   const newContent = e.target.value
  //   setContent(newContent)
  //   saveEditorState({ content: newContent })

  //   if (!isReceivingUpdate.current) {
  //     log.debug('Sending content change to extension', { length: newContent.length })
  //     sendContentChange(newContent)
  //   }
  // }, [])

  // ============ BLOCKNOTE HANDLERS ============
  const handleBlockNoteChange = useCallback((newContent: string): void => {
    setContent(newContent)
    saveEditorState({ content: newContent })
    log.debug('Sending content change to extension', { length: newContent.length })
    sendContentChange(newContent)
  }, [])

  const handleExternalUpdate = useCallback((handler: (markdown: string) => Promise<void>): void => {
    externalUpdateHandlerRef.current = handler
  }, [])

  return (
    <div className="h-screen w-full overflow-auto">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        {!isInitialized ? (
          <div className="flex items-center justify-center text-muted-foreground h-32">
            Loading...
          </div>
        ) : (
          <BlockNoteEditor
            initialContent={content}
            onContentChange={handleBlockNoteChange}
            onExternalUpdate={handleExternalUpdate}
          />
        )}
      </div>
    </div>
  )
}
