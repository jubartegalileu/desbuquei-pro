import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { getEnvVar } from '../services/supabase';
import { supabaseAdmin } from '../services/supabase';
import { TermData } from '../types';

interface FormErrors {
  [key: string]: string;
}

export const Console = () => {
  // ========== SECTION 1: IA SMART GENERATOR ==========
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'edit' | null>(null);
  const [formData, setFormData] = useState<Partial<TermData>>({
    examples: [],
    analogies: [],
    relatedTerms: [],
    practicalUsage: { title: '', content: '' }
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // ========== SECTION 2: JSON RAW IMPORT ==========
  const [jsonInput, setJsonInput] = useState('');
  const [jsonValid, setJsonValid] = useState(true);

  // ========== SECTION 3: BULK UPLOAD ==========
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLog, setUploadLog] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ========== FUNCTIONS ==========

  const getAIClient = () => {
    const apiKey = getEnvVar('VITE_API_KEY') || getEnvVar('API_KEY');
    if (!apiKey) throw new Error('API Key missing');
    return new GoogleGenAI({ apiKey });
  };

  const normalizeId = (term: string): string => {
    return term
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // SECTION 1: IA Smart Generator
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setFormErrors({ search: 'Digite um termo para buscar' });
      return;
    }

    setLoading(true);
    setFormErrors({});
    const normalizedId = normalizeId(searchTerm);

    try {
      // 1️⃣ Try Supabase
      const { data: existingTerm } = await supabaseAdmin
        .from('terms')
        .select('content')
        .eq('id', normalizedId)
        .single();

      if (existingTerm?.content) {
        setFormData(existingTerm.content);
        setMode('edit');
        setFormErrors({ success: `✅ Termo encontrado em edição (Modo EDIT)` });
        setLoading(false);
        return;
      }

      // 2️⃣ Call Gemini AI
      const ai = getAIClient();
      const prompt = `You are a technical glossary expert. Generate a comprehensive definition for the technical term "${searchTerm}".

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "term": "The term name",
  "fullTerm": "The full expanded term",
  "category": "One of: Desenvolvimento, Infraestrutura, Dados & IA, Segurança, Agile & Produto",
  "definition": "A clear, detailed explanation (2-3 sentences)",
  "phonetic": "How to pronounce it",
  "slang": "Alternative names or abbreviations",
  "translation": "Portuguese translation",
  "examples": [
    { "title": "Example 1", "description": "Description here" },
    { "title": "Example 2", "description": "Description here" }
  ],
  "analogies": [
    { "title": "Analogy 1", "description": "Comparison here" },
    { "title": "Analogy 2", "description": "Another comparison" }
  ],
  "practicalUsage": {
    "title": "Real-world example",
    "content": "Concrete usage scenario"
  },
  "relatedTerms": ["Term1", "Term2", "Term3", "Term4"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseSchema: {
            type: 'object',
            properties: {
              term: { type: 'string' },
              fullTerm: { type: 'string' },
              category: { type: 'string' },
              definition: { type: 'string' },
              phonetic: { type: 'string' },
              slang: { type: 'string' },
              translation: { type: 'string' },
              examples: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' }
                  }
                }
              },
              analogies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' }
                  }
                }
              },
              practicalUsage: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' }
                }
              },
              relatedTerms: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      });

      const aiData = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiData) throw new Error('No response from AI');

      const parsedData = JSON.parse(aiData);
      setFormData({
        ...parsedData,
        id: normalizedId
      });
      setMode('edit');
      setFormErrors({ success: `✨ Gerado por IA - Revise antes de salvar` });
    } catch (error) {
      console.error('Search error:', error);
      setFormErrors({ search: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}` });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveTerm = async () => {
    if (!formData.term) {
      setFormErrors({ form: 'Termo é obrigatório' });
      return;
    }

    setLoading(true);
    try {
      const finalData: TermData = {
        id: normalizeId(formData.term || ''),
        term: formData.term || '',
        fullTerm: formData.fullTerm || '',
        category: formData.category || 'Desenvolvimento',
        definition: formData.definition || '',
        phonetic: formData.phonetic || '',
        slang: formData.slang,
        translation: formData.translation || '',
        examples: formData.examples || [],
        analogies: formData.analogies || [],
        practicalUsage: formData.practicalUsage || { title: '', content: '' },
        relatedTerms: formData.relatedTerms || []
      };

      await supabaseAdmin.from('terms').upsert({
        id: finalData.id,
        term: finalData.term,
        category: finalData.category,
        definition: finalData.definition,
        content: finalData,
        created_at: new Date().toISOString()
      });

      setFormErrors({ success: `✅ Termo "${finalData.term}" salvo com sucesso!` });
      setFormData({ examples: [], analogies: [], relatedTerms: [], practicalUsage: { title: '', content: '' } });
      setMode(null);
      setSearchTerm('');
    } catch (error) {
      setFormErrors({ form: `Erro ao salvar: ${error instanceof Error ? error.message : 'Desconhecido'}` });
    } finally {
      setLoading(false);
    }
  };

  // SECTION 2: JSON Raw Import
  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    try {
      JSON.parse(value);
      setJsonValid(true);
    } catch {
      setJsonValid(false);
    }
  };

  const handleProcessJson = async () => {
    if (!jsonValid) {
      setFormErrors({ json: 'JSON inválido' });
      return;
    }

    setLoading(true);
    try {
      const parsedData = JSON.parse(jsonInput);
      const dataToSave = Array.isArray(parsedData) ? parsedData : [parsedData];

      for (const item of dataToSave) {
        const normalized: TermData = {
          id: normalizeId(item.term),
          term: item.term,
          fullTerm: item.fullTerm || '',
          category: item.category || 'Desenvolvimento',
          definition: item.definition,
          phonetic: item.phonetic || '',
          slang: item.slang,
          translation: item.translation,
          examples: item.examples || [],
          analogies: item.analogies || [],
          practicalUsage: item.practicalUsage || { title: '', content: '' },
          relatedTerms: item.relatedTerms || []
        };

        await supabaseAdmin.from('terms').upsert({
          id: normalized.id,
          term: normalized.term,
          category: normalized.category,
          definition: normalized.definition,
          content: normalized,
          created_at: new Date().toISOString()
        });
      }

      setFormErrors({ success: `✅ ${dataToSave.length} termo(s) importado(s) com sucesso!` });
      setJsonInput('');
    } catch (error) {
      setFormErrors({ json: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}` });
    } finally {
      setLoading(false);
    }
  };

  // SECTION 3: Bulk Upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadLog([]);
    setUploadProgress(0);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];
      const total = items.length;

      for (let i = 0; i < total; i++) {
        try {
          const item = items[i];
          const normalized: TermData = {
            id: normalizeId(item.term),
            term: item.term,
            fullTerm: item.fullTerm || '',
            category: item.category || 'Desenvolvimento',
            definition: item.definition,
            phonetic: item.phonetic || '',
            slang: item.slang,
            translation: item.translation,
            examples: item.examples || [],
            analogies: item.analogies || [],
            practicalUsage: item.practicalUsage || { title: '', content: '' },
            relatedTerms: item.relatedTerms || []
          };

          await supabaseAdmin.from('terms').upsert({
            id: normalized.id,
            term: normalized.term,
            category: normalized.category,
            definition: normalized.definition,
            content: normalized,
            created_at: new Date().toISOString()
          });

          setUploadLog(prev => [...prev, `✅ ${normalized.term}`]);
          setUploadProgress(Math.round(((i + 1) / total) * 100));
        } catch (error) {
          const itemName = items[i]?.term || `Item ${i + 1}`;
          setUploadLog(prev => [...prev, `❌ ${itemName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]);
        }
      }
    } catch (error) {
      setUploadLog([`❌ Erro ao ler arquivo: ${error instanceof Error ? error.message : 'Desconhecido'}`]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // ========== RENDER ==========

  return (
    <div className="min-h-screen bg-[#081019] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-display text-cyan-400 mb-2">
            DESBUGUEI Admin Console
          </h1>
          <p className="text-slate-400 text-lg">
            Gerencie o banco de termos com IA, JSON ou upload em massa
          </p>
        </header>

        {/* ALERTS */}
        {Object.entries(formErrors).map(([key, msg]) => (
          <div
            key={key}
            className={`mb-6 p-4 rounded-lg border ${
              msg.includes('✅') || msg.includes('✨')
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : msg.includes('❌')
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}
          >
            {msg}
          </div>
        ))}

        {/* SECTION 1: IA SMART GENERATOR */}
        <section className="mb-8 bg-[#0E1625]/80 backdrop-blur-md border border-[#1E293B] rounded-2xl p-8">
          <h2 className="text-2xl font-bold font-display text-cyan-400 mb-6">
            🤖 IA Smart Generator
          </h2>

          {/* Search Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Buscar ou Gerar Termo
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
                placeholder="ex: Kubernetes, React, Docker..."
                className="flex-1 bg-[#081019] border border-[#1E293B] rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-cyan-400 text-[#081019] font-bold rounded-full hover:shadow-[0_0_20px_-5px_#22d3ee] transition-all duration-300 disabled:opacity-50"
              >
                {loading ? '⏳' : '🔍'} Buscar/Gerar
              </button>
            </div>
          </div>

          {/* Edit Form */}
          {mode === 'edit' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Termo</label>
                  <input
                    type="text"
                    value={formData.term || ''}
                    onChange={e => handleFormChange('term', e.target.value)}
                    className="w-full bg-[#081019] border border-[#1E293B] rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Categoria</label>
                  <select
                    value={formData.category || ''}
                    onChange={e => handleFormChange('category', e.target.value)}
                    className="w-full bg-[#081019] border border-[#1E293B] rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  >
                    <option>Desenvolvimento</option>
                    <option>Infraestrutura</option>
                    <option>Dados & IA</option>
                    <option>Segurança</option>
                    <option>Agile & Produto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Pronúncia</label>
                  <input
                    type="text"
                    value={formData.phonetic || ''}
                    onChange={e => handleFormChange('phonetic', e.target.value)}
                    className="w-full bg-[#081019] border border-[#1E293B] rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gíria/Abreviação</label>
                  <input
                    type="text"
                    value={formData.slang || ''}
                    onChange={e => handleFormChange('slang', e.target.value)}
                    className="w-full bg-[#081019] border border-[#1E293B] rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Definição</label>
                <textarea
                  value={formData.definition || ''}
                  onChange={e => handleFormChange('definition', e.target.value)}
                  rows={3}
                  className="w-full bg-[#081019] border border-[#1E293B] rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tradução (PT-BR)</label>
                <input
                  type="text"
                  value={formData.translation || ''}
                  onChange={e => handleFormChange('translation', e.target.value)}
                  className="w-full bg-[#081019] border border-[#1E293B] rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Termos Relacionados (separados por vírgula)</label>
                <input
                  type="text"
                  value={(formData.relatedTerms || []).join(', ')}
                  onChange={e => handleFormChange('relatedTerms', e.target.value.split(',').map(t => t.trim()))}
                  className="w-full bg-[#081019] border border-[#1E293B] rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>

              <button
                onClick={handleSaveTerm}
                disabled={loading}
                className="w-full px-6 py-3 bg-cyan-400 text-[#081019] font-bold rounded-full hover:shadow-[0_0_20px_-5px_#22d3ee] transition-all duration-300 disabled:opacity-50"
              >
                {loading ? '⏳ Salvando...' : '💾 Salvar no Banco de Dados'}
              </button>
            </div>
          )}
        </section>

        {/* SECTION 2: JSON RAW IMPORT */}
        <section className="mb-8 bg-[#0E1625]/80 backdrop-blur-md border border-[#1E293B] rounded-2xl p-8">
          <h2 className="text-2xl font-bold font-display text-cyan-400 mb-6">
            📄 JSON Raw Import
          </h2>

          <label className="block text-sm font-medium text-slate-300 mb-3">
            Cole um JSON válido ou array de termos
          </label>
          <textarea
            value={jsonInput}
            onChange={e => handleJsonChange(e.target.value)}
            rows={8}
            placeholder={`{
  "term": "React",
  "definition": "...",
  "category": "Desenvolvimento"
}`}
            className={`w-full bg-[#081019] border ${
              jsonValid ? 'border-[#1E293B]' : 'border-red-500'
            } rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 font-mono text-sm`}
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleProcessJson}
              disabled={!jsonValid || loading}
              className="flex-1 px-6 py-3 bg-cyan-400 text-[#081019] font-bold rounded-full hover:shadow-[0_0_20px_-5px_#22d3ee] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? '⏳ Processando...' : '⚡ Processar e Enviar'}
            </button>
          </div>
        </section>

        {/* SECTION 3: BULK UPLOAD */}
        <section className="bg-[#0E1625]/80 backdrop-blur-md border border-[#1E293B] rounded-2xl p-8">
          <h2 className="text-2xl font-bold font-display text-cyan-400 mb-6">
            ☁️ Bulk Upload
          </h2>

          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-[#1E293B] rounded-lg p-12 text-center hover:border-cyan-400/50 transition-colors cursor-pointer mb-6"
          >
            <span className="material-symbols-outlined text-5xl text-slate-500 block mb-3">
              cloud_upload
            </span>
            <p className="text-slate-300 font-medium mb-2">Arraste um arquivo .JSON aqui</p>
            <p className="text-slate-500 text-sm mb-4">ou clique para selecionar</p>
            <input
              type="file"
              accept=".json"
              onChange={e => e.target.files && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="inline-block px-6 py-2 bg-cyan-400/20 text-cyan-400 font-medium rounded-full hover:bg-cyan-400/30 transition-colors"
            >
              Selecionar Arquivo
            </label>
          </div>

          {/* Progress */}
          {isUploading && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Processando...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-[#081019] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Log */}
          {uploadLog.length > 0 && (
            <div className="bg-[#081019] border border-[#1E293B] rounded-lg p-4 font-mono text-sm max-h-48 overflow-y-auto">
              {uploadLog.map((log, idx) => (
                <div
                  key={idx}
                  className={`${
                    log.includes('✅') ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>DESBUGUEI Admin Console • Backend Management • v1.0</p>
        </footer>
      </div>
    </div>
  );
};
