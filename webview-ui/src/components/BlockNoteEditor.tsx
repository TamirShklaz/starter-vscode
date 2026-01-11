// BlockNote styles - must be imported in JS for proper processing
import '@blocknote/core/fonts/inter.css'
import '@blocknote/shadcn/style.css'
import type { FC } from 'react'
import type { Block } from '@blocknote/core'
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core'
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  CreateLinkButton,
  DragHandleMenu,
  FormattingToolbar,
  FormattingToolbarController,
  NestBlockButton,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  UnnestBlockButton,
  useCreateBlockNote,
} from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import { useCallback, useEffect, useRef } from 'react'
import { log } from '@/lib/logger'



// ============ MARKDOWN-COMPATIBLE SCHEMA ============
// Only include blocks/styles that serialize well to GitHub markdown

const markdownBlockSpecs = {
  paragraph: defaultBlockSpecs.paragraph,
  heading: defaultBlockSpecs.heading,
  bulletListItem: defaultBlockSpecs.bulletListItem,
  numberedListItem: defaultBlockSpecs.numberedListItem,
  checkListItem: defaultBlockSpecs.checkListItem,
  codeBlock: defaultBlockSpecs.codeBlock,
  table: defaultBlockSpecs.table,
  quote: defaultBlockSpecs.quote,
  // Omitted: image, audio, video, file (require special handling)
} as const

const markdownStyleSpecs = {
  bold: defaultStyleSpecs.bold,
  italic: defaultStyleSpecs.italic,
  strike: defaultStyleSpecs.strike,
  code: defaultStyleSpecs.code,
  // Omitted: underline, textColor, backgroundColor (not supported in markdown)
} as const

const markdownInlineContentSpecs = {
  text: defaultInlineContentSpecs.text,
  link: defaultInlineContentSpecs.link,
} as const

const markdownSchema = BlockNoteSchema.create({
  blockSpecs: markdownBlockSpecs,
  styleSpecs: markdownStyleSpecs,
  inlineContentSpecs: markdownInlineContentSpecs,
})

// ============ CUSTOM MENUS ============

// Drag handle menu without colors (not supported in markdown)
const MarkdownDragHandleMenu: FC = () => (
  <DragHandleMenu>
    <RemoveBlockItem>Delete</RemoveBlockItem>
    {/* Omit BlockColorsItem - colors not supported in markdown */}
  </DragHandleMenu>
)

// ============ TYPES ============

interface BlockNoteEditorProps {
  className?: string
  initialContent?: string
  onContentChange?: (markdown: string) => void
  onExternalUpdate?: (handler: (markdown: string) => Promise<void>) => void
}

// ============ COMPONENT ============

export const BlockNoteEditor: FC<BlockNoteEditorProps> = ({
  className,
  initialContent,
  onContentChange,
  onExternalUpdate,
}) => {
  log.info('BlockNoteEditor rendering', { initialContentLength: initialContent?.length })

  const isExternalUpdate = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedInitialContent = useRef(false)
  const initialContentRef = useRef(initialContent)

  log.debug('Creating BlockNote editor with schema')
  const editor = useCreateBlockNote({ schema: markdownSchema })
  log.debug('BlockNote editor created')

  // Handle content changes from the editor
  const handleChange = useCallback(async (): Promise<void> => {
    if (isExternalUpdate.current) {
      return
    }

    const markdown = await editor.blocksToMarkdownLossy(editor.document)
    log.debug('BlockNote content changed', { length: markdown.length })

    // Debounce content changes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      onContentChange?.(markdown)
    }, 300)
  }, [editor, onContentChange])

  // Handle external content updates (from extension)
  const handleExternalContent = useCallback(async (markdown: string): Promise<void> => {
    log.debug('Receiving external content', { length: markdown.length })
    isExternalUpdate.current = true

    try {
      const blocks = await editor.tryParseMarkdownToBlocks(markdown) as Block<typeof markdownSchema.blockSchema, typeof markdownSchema.inlineContentSchema, typeof markdownSchema.styleSchema>[]
      log.debug('Parsed blocks', { count: blocks.length })
      editor.replaceBlocks(editor.document, blocks)
    }
    catch (error) {
      log.error('Failed to parse markdown', { error })
    }

    requestAnimationFrame(() => {
      isExternalUpdate.current = false
    })
  }, [editor])

  // Register the external update handler
  useEffect(() => {
    onExternalUpdate?.(handleExternalContent)
  }, [onExternalUpdate, handleExternalContent])

  // Load initial content (only once on mount)
  useEffect(() => {
    if (hasLoadedInitialContent.current) {
      return
    }

    const loadInitialContent = async (): Promise<void> => {
      if (initialContentRef.current) {
        hasLoadedInitialContent.current = true
        isExternalUpdate.current = true

        try {
          const blocks = await editor.tryParseMarkdownToBlocks(initialContentRef.current) as Block<typeof markdownSchema.blockSchema, typeof markdownSchema.inlineContentSchema, typeof markdownSchema.styleSchema>[]
          editor.replaceBlocks(editor.document, blocks)
        }
        catch (error) {
          log.error('Failed to parse initial markdown', { error })
        }

        requestAnimationFrame(() => {
          isExternalUpdate.current = false
        })
      }
    }

    loadInitialContent()
  }, [editor])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  log.info('BlockNoteEditor about to render BlockNoteView')

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      formattingToolbar={false}
      sideMenu={false}
      className={className}
    >
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar>
            <BlockTypeSelect key="blockTypeSelect" />

            <BasicTextStyleButton basicTextStyle="bold" key="bold" />
            <BasicTextStyleButton basicTextStyle="italic" key="italic" />
            <BasicTextStyleButton basicTextStyle="strike" key="strike" />
            <BasicTextStyleButton basicTextStyle="code" key="code" />

            <NestBlockButton key="nest" />
            <UnnestBlockButton key="unnest" />

            <CreateLinkButton key="link" />
          </FormattingToolbar>
        )}
      />

      <SideMenuController
        sideMenu={props => (
          <SideMenu {...props} dragHandleMenu={MarkdownDragHandleMenu} />
        )}
      />
    </BlockNoteView>
  )
}
