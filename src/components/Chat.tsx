import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store';
import { MessageSquare, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const QUICK_EMOJIS = ['😂', '🔥', '🤔', '🎶', '👏', '👀', '💀', '🎉'];

export function Chat() {
  const { chatMessages, isChatOpen, actions, playerName } = useGameStore();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim()) {
      actions.sendChatMessage(message.trim());
      setMessage('');
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={actions.toggleChat}
        className="fixed bottom-4 right-4 z-[100] w-14 h-14 bg-vox-yellow text-vox-black rounded-full border-4 border-vox-black shadow-vox flex items-center justify-center hover:scale-110 transition-transform"
      >
        {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-4 z-[100] w-80 sm:w-96 h-[400px] bg-vox-white border-4 border-vox-black shadow-vox flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-vox-yellow text-vox-black p-3 border-b-4 border-vox-black font-black uppercase tracking-widest flex justify-between items-center">
              <span>Live Chat</span>
              <span className="text-xs bg-vox-black text-vox-yellow px-2 py-1 rounded-full">
                {chatMessages.length} msgs
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-vox-paper dark:bg-vox-card-bg">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-vox-gray font-bold text-sm text-center">
                  No messages yet.<br/>Be the first to say hi!
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.playerName === playerName;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] font-bold text-vox-gray mb-1 px-1 uppercase">
                        {msg.playerName}
                      </span>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl border-2 border-vox-black font-bold text-sm break-words ${
                          isMe
                            ? 'bg-vox-yellow text-vox-black rounded-tr-none'
                            : 'bg-white text-vox-black rounded-tl-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-vox-white border-t-4 border-vox-black">
              {/* Quick Emojis */}
              <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-vox-paper border-2 border-vox-black rounded hover:bg-vox-yellow transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border-2 border-vox-black bg-white text-vox-black font-bold text-sm focus:outline-none focus:ring-2 focus:ring-vox-yellow"
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="w-10 h-10 flex items-center justify-center bg-vox-yellow border-2 border-vox-black text-vox-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-vox-red transition-colors"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
