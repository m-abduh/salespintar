import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../stores/auth';
import { Send, ArrowLeft, UserCheck, RotateCcw, CheckCircle } from 'lucide-react';

export default function Chat() {
  const { id: selectedId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { on } = useWebSocket();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiGet<any>('/conversations?limit=50'),
    refetchInterval: 10000,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => apiGet<any>(`/conversations/${selectedId}/messages?limit=100`),
    enabled: !!selectedId,
    refetchInterval: 5000,
  });

  const selectedConv = conversations?.data?.find((c: any) => c.id === selectedId);

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      apiPost(`/conversations/${selectedId}/messages`, { message: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
    },
  });

  const takeoverMutation = useMutation({
    mutationFn: () => apiPost(`/conversations/${selectedId}/takeover`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: () => apiPost(`/conversations/${selectedId}/release`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => apiPost(`/conversations/${selectedId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      navigate('/app/chat');
    },
  });

  useEffect(() => {
    const unsub = on('chat:new', (data: any) => {
      if (data.conversationId === selectedId) {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return unsub;
  }, [on, selectedId, queryClient]);

  useEffect(() => {
    const unsub = on('chat:status', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return unsub;
  }, [on, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedId) return;
    sendMutation.mutate(message.trim());
    setMessage('');
  };

  const isHuman = selectedConv?.status === 'HUMAN';
  const isMyTakeover = selectedConv?.human?.id === user?.id;

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6">
      <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold">Percakapan</h2>
        </div>
        {conversations?.data?.length === 0 && (
          <p className="p-4 text-sm text-gray-400">Belum ada percakapan</p>
        )}
        {conversations?.data?.map((c: any) => (
          <button
            key={c.id}
            onClick={() => navigate(`/app/chat/${c.id}`)}
            className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 ${
              selectedId === c.id ? 'bg-indigo-50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-600 flex-shrink-0">
                {(c.lead?.name || c.lead?.waNumber || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.lead?.name || c.lead?.waNumber}</p>
                <p className="text-xs text-gray-400 truncate">
                  {c.messages?.[0]?.message || '...'}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                c.status === 'AI' ? 'bg-cyan-50 text-cyan-600' :
                c.status === 'HUMAN' ? 'bg-amber-50 text-amber-600' :
                'bg-gray-100 text-gray-500'
              }`}>
                {c.status}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Send className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Pilih percakapan untuk mulai chat</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/app/chat')} className="lg:hidden p-1">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <p className="font-medium">{selectedConv?.lead?.name || selectedConv?.lead?.waNumber}</p>
                  <p className="text-xs text-gray-400">
                    {isHuman ? `Diambil oleh ${selectedConv?.human?.name || 'sales'}` : 'AI Auto Reply'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isHuman && user?.role === 'SALES' && (
                  <button
                    onClick={() => takeoverMutation.mutate()}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100"
                  >
                    <UserCheck className="w-4 h-4" /> Ambil Alih
                  </button>
                )}
                {isHuman && isMyTakeover && (
                  <>
                    <button
                      onClick={() => releaseMutation.mutate()}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      <RotateCcw className="w-4 h-4" /> Kembalikan
                    </button>
                    <button
                      onClick={() => completeMutation.mutate()}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                    >
                      <CheckCircle className="w-4 h-4" /> Selesai
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messagesData?.data?.map((m: any) => (
                <div key={m.id} className={`flex ${m.fromRole === 'LEAD' ? '' : 'justify-end'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl ${
                    m.fromRole === 'LEAD'
                      ? 'bg-gray-100 rounded-bl-sm'
                      : m.fromRole === 'AI'
                      ? 'bg-indigo-50 rounded-br-sm'
                      : 'bg-indigo-600 text-white rounded-br-sm'
                  }`}>
                    <p className="text-sm">{m.message}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      {m.fromRole === 'HUMAN' && ` - ${m.human?.name || 'Sales'}`}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ketik pesan..."
                />
                <button
                  type="submit"
                  disabled={!message.trim() || sendMutation.isPending}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
