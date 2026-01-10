import type {
  CancellationToken,
  CustomTextEditorProvider,
  ExtensionContext,
  TextDocument,
  WebviewPanel,
} from 'vscode';
import { Range, Uri, workspace, WorkspaceEdit } from 'vscode';
import { log } from '../utils/logger';

const generateNonce = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
};

export class MarkdownEditorProvider implements CustomTextEditorProvider {
  public static readonly viewType = 'nota.markdownEditor';

  constructor(private readonly context: ExtensionContext) {}

  resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel,
    _token: CancellationToken
  ): void {
    log.info('Opening editor for document', { uri: document.uri.toString() });

    // Enable scripts in webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
      ],
    };

    // Set HTML content
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel);
    log.debug('Webview HTML set');

    // Track if we're applying an edit to prevent update loops
    let isApplyingEdit = false;

    // Send content to webview
    const sendContentToWebview = (type: 'init' | 'update'): void => {
      const content = document.getText();
      log.debug(`Sending ${type} to webview`, { contentLength: content.length });
      webviewPanel.webview.postMessage({ type, content });
    };

    // Listen for messages from the webview
    const messageSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (message: { type: string; content?: string }) => {
        log.debug('Received message from webview', { type: message.type });

        if (message.type === 'ready') {
          // Webview is ready, send initial content
          log.info('Webview ready, sending init');
          sendContentToWebview('init');
          return;
        }

        if (message.type === 'contentChange' && typeof message.content === 'string') {
          // Skip if content hasn't changed
          if (message.content === document.getText()) {
            log.debug('Content unchanged, skipping update');
            return;
          }

          log.debug('Applying content change from webview', { contentLength: message.content.length });
          isApplyingEdit = true;

          // Replace entire document content
          const edit = new WorkspaceEdit();
          const fullRange = new Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          );
          edit.replace(document.uri, fullRange, message.content);

          await workspace.applyEdit(edit);

          isApplyingEdit = false;
        }
      }
    );

    // Listen for external document changes
    const changeDocumentSubscription = workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        // Don't send update if we caused this change
        if (isApplyingEdit) {
          log.debug('Skipping update (self-caused change)');
          return;
        }
        log.debug('External document change detected');
        sendContentToWebview('update');
      }
    });

    // Clean up on dispose
    webviewPanel.onDidDispose(() => {
      log.info('Editor disposed', { uri: document.uri.toString() });
      changeDocumentSubscription.dispose();
      messageSubscription.dispose();
    });
  }

  private getHtmlForWebview(webviewPanel: WebviewPanel): string {
    const webview = webviewPanel.webview;

    // Get URIs for webview assets
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', 'index.js')
    );

    const styleUri = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', 'index.css')
    );

    log.debug('Asset URIs', { script: scriptUri.toString(), style: styleUri.toString() });

    const nonce = generateNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; 
                   style-src ${webview.cspSource} 'unsafe-inline'; 
                   font-src ${webview.cspSource}; 
                   script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Nota Editor</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
