/**
 * VS Code Webview API Bridge
 *
 * Webviews run in an isolated iframe with no direct access to VS Code APIs
 * or the file system. This module provides two communication mechanisms:
 *
 * 1. State Persistence (saveState/getState)
 *    - Stores data within the webview's memory
 *    - Survives tab switches and webview hide/show cycles
 *    - Lost when VS Code restarts
 *    - Use for: UI state, editor content between tab switches
 *
 * 2. Extension Messaging (sendToExtension/onMessageFromExtension)
 *    - Sends messages to the extension backend (Node.js process)
 *    - Extension can read/write files, access VS Code APIs
 *    - Use for: Saving to disk, triggering VS Code commands
 */

type VSCodeApi = {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

declare function acquireVsCodeApi(): VSCodeApi;

const isVSCode = typeof acquireVsCodeApi === "function";

const vscode: VSCodeApi = isVSCode
  ? acquireVsCodeApi()
  : {
      postMessage: (_msg: unknown) => {
        console.log("[Dev Mode] postMessage:", _msg);
      },
      getState: () => ({}),
      setState: (_state: unknown) => {
        console.log("[Dev Mode] setState:", _state);
      },
    };

export { isVSCode };

/**
 * Send a message to the VS Code extension backend.
 * The extension receives this via `webviewPanel.webview.onDidReceiveMessage()`.
 */
export const sendToExtension = (message: unknown): void => {
  vscode.postMessage(message);
};

/**
 * Listen for messages from the VS Code extension.
 * The extension sends these via `webviewPanel.webview.postMessage()`.
 */
export const onMessageFromExtension = (
  callback: (message: unknown) => void
): (() => void) => {
  const handler = (event: MessageEvent) => callback(event.data);
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
};

/**
 * Persist state within the webview.
 * Survives when user switches tabs or hides the webview.
 * Does NOT save to disk — use sendToExtension for that.
 */
export const saveState = (state: unknown): void => {
  vscode.setState(state);
};

/**
 * Retrieve previously saved webview state.
 * Returns undefined if no state was saved.
 */
export const getState = (): unknown => {
  return vscode.getState();
};
