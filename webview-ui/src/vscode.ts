/**
 * VS Code Webview API Bridge
 *
 * Webviews run in an isolated iframe with no direct access to VS Code APIs
 * or the file system. This module provides communication between the
 * webview and the VS Code extension.
 *
 * Message Flow:
 * - Extension → Webview: init (initial content), update (external changes)
 * - Webview → Extension: contentChange (user edits)
 */

// Message types from extension to webview
export type ExtensionMessage =
  | { type: 'init'; content: string }
  | { type: 'update'; content: string };

// Message types from webview to extension
export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'contentChange'; content: string };

type VSCodeApi = {
  postMessage(message: WebviewMessage): void;
  getState(): EditorState | undefined;
  setState(state: EditorState): void;
};

// State persisted in webview memory (survives tab switches)
export type EditorState = {
  content: string;
};

declare function acquireVsCodeApi(): VSCodeApi;

const isVSCode = typeof acquireVsCodeApi === 'function';

const vscode: VSCodeApi = isVSCode
  ? acquireVsCodeApi()
  : {
      postMessage: (msg: WebviewMessage) => {
        console.log('[Dev Mode] postMessage:', msg);
      },
      getState: () => undefined,
      setState: (state: EditorState) => {
        console.log('[Dev Mode] setState:', state);
      },
    };

export { isVSCode };

/**
 * Tell the extension the webview is ready to receive content.
 * Extension should send 'init' message after receiving this.
 */
export const sendReady = (): void => {
  vscode.postMessage({ type: 'ready' });
};

/**
 * Send content change to the VS Code extension.
 * The extension will apply this to the TextDocument.
 */
export const sendContentChange = (content: string): void => {
  vscode.postMessage({ type: 'contentChange', content });
};

/**
 * Listen for messages from the VS Code extension.
 * Returns unsubscribe function.
 */
export const onExtensionMessage = (
  callback: (message: ExtensionMessage) => void
): (() => void) => {
  const handler = (event: MessageEvent<ExtensionMessage>): void => {
    const message = event.data;
    if (message && (message.type === 'init' || message.type === 'update')) {
      callback(message);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
};

/**
 * Save editor state to webview memory.
 * Survives tab switches but not VS Code restarts.
 */
export const saveEditorState = (state: EditorState): void => {
  vscode.setState(state);
};

/**
 * Get previously saved editor state.
 */
export const getEditorState = (): EditorState | undefined => {
  return vscode.getState();
};
