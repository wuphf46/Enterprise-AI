import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bot, Loader2, Send, User } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';

type Message = { role: 'user' | 'assistant'; content: string };
type ChatResponse = { answer: string; sources?: unknown[]; conversation_id: string; status?: string };

export function ChatPage() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const chat = useMutation({
    mutationFn: async (value: string) => (await api.post<ChatResponse>('/api/chat', { question: value, conversation_id: conversationId })).data,
    onSuccess: (response, value) => {
      setConversationId(response.conversation_id);
      setMessages((current) => [...current, { role: 'user', content: value }, { role: 'assistant', content: response.answer }]);
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = question.trim();
    if (!value || chat.isPending) return;
    setQuestion('');
    chat.mutate(value);
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-4xl flex-col animate-fade-in">
      <header className="mb-6"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspace assistant</p><h1 className="text-3xl font-semibold tracking-tight">How can I help?</h1><p className="mt-3 text-sm text-muted-foreground">Ask questions about the documents in your enterprise knowledge base.</p></header>
      <div className="flex-1 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        {!messages.length && <div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><div className="mb-4 rounded-2xl bg-primary/10 p-4 text-primary"><Bot size={28} /></div><h2 className="font-semibold">Start a conversation</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">Responses will use your uploaded workspace documents.</p></div>}
        {messages.map((message, index) => <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} key={`${message.role}-${index}`}><div className={`flex max-w-[85%] gap-3 rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>{message.role === 'assistant' && <Bot className="mt-1 shrink-0" size={16} />}<span>{message.content}</span>{message.role === 'user' && <User className="mt-1 shrink-0" size={16} />}</div></div>)}
        {chat.isPending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={16} /> Thinking...</div>}
        {chat.isError && <p className="text-sm text-red-300">{chat.error instanceof Error ? chat.error.message : 'Unable to send your message.'}</p>}
      </div>
      <form className="mt-4 flex gap-2 rounded-2xl border border-border bg-card p-2" onSubmit={submit}><textarea className="min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground" placeholder="Ask a question..." value={question} onChange={(event) => setQuestion(event.target.value)} /><Button aria-label="Send message" className="self-end" disabled={!question.trim() || chat.isPending} size="icon"><Send size={17} /></Button></form>
    </section>
  );
}
