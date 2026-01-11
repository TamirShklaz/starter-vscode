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
    <div className="flex flex-col h-screen w-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <span className="text-sm text-muted-foreground">
          {isVSCode ? 'Nota Editor' : 'Development Mode'}
        </span>
        <span className="text-xs text-muted-foreground">
          {content.length} characters
        </span>
      </div>

      {/* Editor */}
      {!isInitialized ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      ) : (
        // ============ TEXTAREA VERSION ============
        // <textarea
        //   value={content}
        //   onChange={handleTextareaChange}
        //   className="flex-1 w-full p-4 bg-background text-foreground font-mono text-sm resize-none focus:outline-none"
        //   spellCheck={false}
        // />

        // ============ BLOCKNOTE VERSION ============
        <BlockNoteEditor
          className="flex-1 overflow-auto"
          initialContent={content}
          onContentChange={handleBlockNoteChange}
          onExternalUpdate={handleExternalUpdate}
        />
      )}
    </div>
  )
}
