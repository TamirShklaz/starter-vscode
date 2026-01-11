# AGENTS.md

Instructions for AI coding assistants working on the Nota VS Code extension.

## Project Overview

Nota is a VS Code extension that provides a custom markdown editor using React webviews. The project has two main parts:

- **Extension** (`src/`) - Node.js code running in VS Code
- **Webview UI** (`webview-ui/`) - React app running in webview iframe

## Quick Commands

```bash
# Install dependencies
pnpm install

# Development (watch mode for both extension and webview)
pnpm dev

# Build everything
pnpm build

# Type check extension
pnpm typecheck

# Type check webview
cd webview-ui && pnpm tsc --noEmit

# Lint and fix
pnpm lint --fix
cd webview-ui && pnpm lint --fix
```

## After Writing Code

**ALWAYS run these commands after making code changes:**

```bash
# 1. Type check both projects
pnpm typecheck
cd webview-ui && pnpm tsc --noEmit

# 2. Lint and auto-fix both projects
pnpm lint --fix
cd webview-ui && pnpm lint --fix
```

Fix any errors before considering the task complete.

## Project Structure

```
nota/
├── src/                    # Extension code (Node.js)
│   ├── index.ts           # Extension entry point
│   ├── editor/            # Custom editor providers
│   └── utils/             # Utilities (logger, etc.)
├── webview-ui/            # React webview app
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── vscode.ts      # VS Code API bridge
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities
│   └── package.json
├── dist/                  # Built extension output
│   ├── index.cjs          # Extension bundle
│   └── webview/           # Built webview assets
└── package.json           # Extension manifest
```

## Code Style

Follow the rules in `.cursor/rules/code.protocol.mdc`:

- **Functions over classes** - Use factory functions (`createX`)
- **Arrow functions only** - No `function` declarations
- **Explicit types** - Always type function parameters and returns
- **Named exports only** - No default exports
- **Early returns** - Exit early to reduce nesting

### React Components

```tsx
import type { FC } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
}

export const MyComponent: FC<Props> = ({ value, onChange }) => {
  return <div>{value}</div>
}
```

## Extension ↔ Webview Communication

Messages flow through a typed bridge:

**Extension → Webview:**
- `{ type: 'init', content: string }` - Initial document content
- `{ type: 'update', content: string }` - External document changes

**Webview → Extension:**
- `{ type: 'ready' }` - Webview is mounted and ready
- `{ type: 'contentChange', content: string }` - User edited content

### Important: Ready Handshake

The webview must send a `ready` message before the extension sends `init`. This prevents race conditions where the extension sends content before React mounts.

## Logging

### Extension Logs

```typescript
import { log } from './utils/logger'

log.debug('Debug info', { data: 'value' })
log.info('Important event')
log.error('Something failed', error)
```

View logs: Output Panel → Select "Nota"

### Webview Logs

```typescript
import { log } from '@/lib/logger'

log.debug('Debug info', { data: 'value' })
log.info('Important event')
```

View logs: Command Palette → `Developer: Open Webview Developer Tools` → Console

## Testing the Extension

1. Run `pnpm dev` to start watch mode
2. Press **F5** to launch Extension Development Host
3. Open any `.md` file
4. Right-click → "Open With..." → "Nota Markdown Editor"

## Key Files to Understand

| File | Purpose |
|------|---------|
| `src/index.ts` | Extension activation, registers editor provider |
| `src/editor/MarkdownEditorProvider.ts` | Custom editor implementation |
| `webview-ui/src/App.tsx` | Main React editor component |
| `webview-ui/src/vscode.ts` | Message bridge between React and extension |
| `package.json` | Extension manifest with `customEditors` contribution |

## Common Tasks

### Adding a New Message Type

1. Add type to `webview-ui/src/vscode.ts` (`ExtensionMessage` or `WebviewMessage`)
2. Handle in `MarkdownEditorProvider.ts` (extension side)
3. Handle in `App.tsx` (webview side)

### Adding a New shadcn Component

```bash
cd webview-ui
pnpm dlx shadcn@latest add [component-name]
```

### Debugging Communication Issues

1. Add `log.debug()` calls in both extension and webview
2. Check Output Panel for extension logs
3. Check Webview DevTools Console for webview logs

## Don't

- Don't commit to git without explicit user request
- Don't modify `nota-legacy/` - it's reference code only
- Don't add dependencies without checking latest versions
- Don't use `any` type - use `unknown` and narrow

## When Stuck

- Check logs in both Output Panel and Webview DevTools
- Verify the build completed: `pnpm build`
- Restart the Extension Development Host (Ctrl+Shift+F5)
- Ask for clarification if requirements are unclear
