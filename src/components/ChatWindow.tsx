import React from 'react';
import { ChatView } from './Chat/ChatView';

/**
 * ChatWindow.tsx
 * Canonical export for ChatWindow matching official Telegram layout
 */
export const ChatWindow: React.FC = () => {
  return <ChatView />;
};

export default ChatWindow;
