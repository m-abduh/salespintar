import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPut } from '../lib/api';
import { Save, RotateCcw, Sparkles } from 'lucide-react';

const AVAILABLE_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'qwen/qwen3.6-27b',
  'mixtral-8x7b-32768',
];

export default function PromptTraining() {
  const [form, setForm] = useState({
    prompt: '',
    model: '',
    fallbackModel: '',
    temperature: 0.7,
    maxTokens: 1024,
    dailyCap: 50,
    contextLimit: 20,
    labelLead: '',
    labelHuman: '',
    labelAI: '',
  });
  const [saved, setSaved] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['ai-config'],
    queryFn: () => apiGet<any>('/business/ai-config'),
  });

  useEffect(() => {
    if (config) {
      setForm({
        prompt: config.prompt || '',
        model: config.model || '',
        fallbackModel: config.fallbackModel || '',
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 1024,
        dailyCap: config.dailyCap ?? 50,
        contextLimit: config.contextLimit ?? 20,
        labelLead: config.labelLead || '',
        labelHuman: config.labelHuman || '',
        labelAI: config.labelAI || '',
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiPut('/business/ai-config', data),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => apiGet<any>('/ai/test'),
  });

  const handleSave = () => {
    const payload: Record<string, any> = {};
    if (form.prompt) payload.prompt = form.prompt;
    if (form.model) payload.model = form.model;
    if (form.fallbackModel) payload.fallbackModel = form.fallbackModel;
    if (form.labelLead) payload.labelLead = form.labelLead;
    if (form.labelHuman) payload.labelHuman = form.labelHuman;
    if (form.labelAI) payload.labelAI = form.labelAI;
    payload.temperature = form.temperature;
    payload.maxTokens = form.maxTokens;
    payload.dailyCap = form.dailyCap;
    payload.contextLimit = form.contextLimit;
    saveMutation.mutate(payload);
  };

  const handleReset = () => {
    setForm({ prompt: '', model: '', fallbackModel: '', temperature: 0.7, maxTokens: 1024, dailyCap: 50, contextLimit: 20, labelLead: '', labelHuman: '', labelAI: '' });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Memuat...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prompt & Training</h1>
          <p className="text-sm text-gray-500 mt-1">Atur perilaku AI sesuai bisnismu</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Config berhasil disimpan
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            System Prompt
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Instruksi dasar untuk AI. Kosongkan untuk memakai default bawaan.
          </p>
          <textarea
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            rows={10}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
            placeholder="Kamu adalah AI Customer Service untuk..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Model AI</label>
            <p className="text-xs text-gray-400 mb-3">Pilih model Groq yang dipakai</p>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            >
              <option value="">Default ({AVAILABLE_MODELS[0]})</option>
              {AVAILABLE_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Fallback Model</label>
            <p className="text-xs text-gray-400 mb-3">Model cadangan jika utama gagal</p>
            <select
              value={form.fallbackModel}
              onChange={(e) => setForm({ ...form, fallbackModel: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            >
              <option value="">Default (mixtral-8x7b-32768)</option>
              {AVAILABLE_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature: {form.temperature}
            </label>
            <p className="text-xs text-gray-400 mb-3">0 = konsisten, 2 = kreatif</p>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Presisi</span>
              <span>Kreatif</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Tokens: {form.maxTokens}
            </label>
            <p className="text-xs text-gray-400 mb-3">Maksimal panjang jawaban AI</p>
            <input
              type="range"
              min="64"
              max="8192"
              step="64"
              value={form.maxTokens}
              onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Pendek</span>
              <span>Panjang</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Cap per Lead: {form.dailyCap}
            </label>
            <p className="text-xs text-gray-400 mb-3">Maksimal AI reply per lead per hari</p>
            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={form.dailyCap}
              onChange={(e) => setForm({ ...form, dailyCap: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0 (mati)</span>
              <span>500</span>
            </div>
            {form.dailyCap === 0 && (
              <p className="text-xs text-amber-600 mt-2">AI tidak akan membalas sama sekali</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Konteks Pesan: {form.contextLimit}
            </label>
            <p className="text-xs text-gray-400 mb-3">Jumlah chat terakhir yg diingat AI</p>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={form.contextLimit}
              onChange={(e) => setForm({ ...form, contextLimit: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span>
              <span>100</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Label Pelanggan</label>
            <p className="text-xs text-gray-400 mb-3">Kosongkan untuk default "Pelanggan"</p>
            <input
              type="text"
              value={form.labelLead}
              onChange={(e) => setForm({ ...form, labelLead: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              placeholder="Pelanggan"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Label Sales</label>
            <p className="text-xs text-gray-400 mb-3">Kosongkan untuk default "Sales"</p>
            <input
              type="text"
              value={form.labelHuman}
              onChange={(e) => setForm({ ...form, labelHuman: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              placeholder="Sales"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Label AI</label>
            <p className="text-xs text-gray-400 mb-3">Kosongkan untuk default "AI"</p>
            <input
              type="text"
              value={form.labelAI}
              onChange={(e) => setForm({ ...form, labelAI: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              placeholder="AI"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Test AI</label>
          <p className="text-xs text-gray-400 mb-3">Coba respon dengan config saat ini</p>
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {testMutation.isPending ? 'Memproses...' : 'Test AI'}
          </button>
          {testMutation.data && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium text-gray-700 mb-1">Respon:</p>
              <p className="text-gray-600">{testMutation.data.reply || 'Gagal'}</p>
            </div>
          )}
          {testMutation.isError && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-600">
              Error: {(testMutation.error as any)?.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}