import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { isVSCode, sendToExtension, onMessageFromExtension } from '@/vscode';

export const App: FC = () => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // Listen for messages from the VS Code extension
    const unsubscribe = onMessageFromExtension((msg) => {
      if (typeof msg === 'object' && msg !== null && 'type' in msg) {
        const { type, data } = msg as { type: string; data?: unknown };
        if (type === 'update') {
          setMessage(String(data ?? ''));
        }
      }
    });

    return unsubscribe;
  }, []);

  const handleClick = (): void => {
    setCount((prev) => prev + 1);
    // Notify the extension about the click
    sendToExtension({ type: 'click', count: count + 1 });
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Nota Webview</h1>
      <p className="text-muted-foreground text-sm">
        Running in: {isVSCode ? 'VS Code Extension' : 'Development Mode'}
      </p>
      {message && <p className="text-green-500 font-medium">{message}</p>}
      <div className="flex flex-col items-center gap-4">
        <Button onClick={handleClick} size="lg">
          Count is {count}
        </Button>
        <p className="text-muted-foreground text-sm">
          Edit <code className="bg-muted px-1 py-0.5 rounded text-xs">src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </div>
  );
};
