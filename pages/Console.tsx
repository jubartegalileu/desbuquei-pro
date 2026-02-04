import React, { useState } from 'react';
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
  const [mode, setMode] = useState<'search' | 'table' | null>(null);
  const [tableData, setTableData] = useState<Partial<TermData>>({
    examples: [],
    analogies: [],
    relatedTerms: [],
    practicalUsage: { title: '', content: '' }
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // ========== SECTION 2: JSON RAW IMPORT ==========
  const [jsonInput, setJsonInput] = useState(JSON.stringify({
    term: "ESCREVA AQUI - Nome do termo (ex: React)",
    fullTerm: "ESCREVA AQUI - Nome completo (ex: React JavaScript Library)",
    category: "ESCREVA AQUI - Uma de: Desenvolvimento, Infraestrutura, Dados & IA, Segurança, Agile & Produto",
    definition: "ESCREVA AQUI - Explicação detalhada do termo",
    phonetic: "ESCREVA AQUI - Como pronunciar",
    slang: "ESCREVA AQUI - Abreviação ou gíria",
    translation: "ESCREVA AQUI - Tradução para português",
    examples: [
      {
        title: "ESCREVA AQUI - Título do exemplo 1",
        description: "ESCREVA AQUI - Descrição do exemplo 1"
      },
      {
        title: "ESCREVA AQUI - Título do exemplo 2",
        description: "ESCREVA AQUI - Descrição do exemplo 2"
      }
    ],
    analogies: [
      {
        title: "ESCREVA AQUI - Título da analogia 1",
        description: "ESCREVA AQUI - Descrição da analogia 1"
      },
      {
        title: "ESCREVA AQUI - Título da analogia 2",
        description: "ESCREVA AQUI - Descrição da analogia 2"
      }
    ],
    practicalUsage: {
      title: "ESCREVA AQUI - Titulo do uso prático",
      content: "ESCREVA AQUI - Exemplo de código ou uso real"
    },
    relatedTerms: [
      "ESCREVA AQUI - Termo relacionado 1",
      "ESCREVA AQUI - Termo relacionado 2",
      "ESCREVA AQUI - Termo relacionado 3"
    ]
  }, null, 2));
  const [jsonValid, setJsonValid] = useState(true);

  // ========== SECTION 3: BULK UPLOAD ==========
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLog, setUploadLog] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ========== FUNCTIONS ==========

  const callOpenAI = async (prompt: string): Promise<string> => {
    const apiKey = getEnvVar('VITE_OPENAI_API_KEY');
    if (!apiKey) throw new Error('OpenAI API Key missing');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
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
      setFormErrors({ search: '❌ Digite um termo para buscar' });
      return;
    }

    if (loading) return; // Evita múltiplas cliques

    setLoading(true);
    setFormErrors({ search: '⏳ Processando com OpenAI...' });
    const normalizedId = normalizeId(searchTerm);

    try {
      // 1️⃣ Try Supabase
      const { data: existingTerm } = await supabaseAdmin
        .from('terms')
        .select('content')
        .eq('id', normalizedId)
        .single();

      if (existingTerm?.content) {
        setTableData(existingTerm.content);
        setMode('table');
        setFormErrors({ success: `✅ Termo encontrado! Modo EDIÇÃO ativo` });
        setLoading(false);
        return;
      }

      // 2️⃣ Call OpenAI GPT
      const prompt = `You are a technical glossary expert. Generate a comprehensive definition for the technical term "${searchTerm}".

Return ONLY a valid JSON object (no markdown, no code blocks, no extra text) with this exact structure:
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

      const aiResponse = await callOpenAI(prompt);

      // Limpar JSON se vier com markdown
      let cleanJson = aiResponse;
      if (cleanJson.includes('```json')) {
        cleanJson = cleanJson.split('```json')[1].split('```')[0];
      } else if (cleanJson.includes('```')) {
        cleanJson = cleanJson.split('```')[1].split('```')[0];
      }

      const parsedData = JSON.parse(cleanJson.trim());
      setTableData({
        ...parsedData,
        id: normalizedId
      });
      setMode('table');
      setFormErrors({ success: `✨ Gerado por IA! Revise os dados abaixo` });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Desconhecido';
      setFormErrors({ search: `❌ Erro: ${errorMsg}` });
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (field: string, value: any) => {
    setTableData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayItemChange = (arrayName: string, index: number, field: string, value: string) => {
    const arr = (tableData[arrayName as keyof TermData] as any[]) || [];
    const newArr = [...arr];
    if (!newArr[index]) newArr[index] = {};
    newArr[index][field] = value;
    handleTableChange(arrayName, newArr);
  };

  const handleRelatedTermChange = (index: number, value: string) => {
    const arr = tableData.relatedTerms || [];
    const newArr = [...arr];
    newArr[index] = value;
    handleTableChange('relatedTerms', newArr);
  };

  const handleRefreshField = async (field: string) => {
    if (loading) return; // Evita múltiplas cliques

    try {
      setLoading(true);
      setFormErrors({ search: '⏳ Atualizando com OpenAI...' });

      const ai = getAIClient();

      let prompt = '';
      if (field === 'definition') {
        prompt = `Provide a clear technical definition for "${tableData.term}". Return only the definition text, no quotes, no markdown.`;
      } else if (field === 'phonetic') {
        prompt = `How to pronounce "${tableData.term}" in English? Return only the phonetic pronunciation, no quotes, no markdown.`;
      } else if (field === 'translation') {
        prompt = `Translate "${tableData.term}" to Portuguese. Return only the translation, no quotes, no markdown.`;
      }

      if (prompt) {
        const result = await callOpenAI(prompt);
        handleTableChange(field, result.replace(/^"|"$/g, '').trim());
        setFormErrors({ success: `✅ Campo "${field}" atualizado!` });
      }
    } catch (error) {
      setFormErrors({ error: `❌ Erro ao atualizar: ${error instanceof Error ? error.message : 'Desconhecido'}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTerm = async () => {
    if (!tableData.term) {
      setFormErrors({ form: '❌ Termo é obrigatório' });
      return;
    }

    setLoading(true);
    try {
      const finalData: TermData = {
        id: normalizeId(tableData.term || ''),
        term: tableData.term || '',
        fullTerm: tableData.fullTerm || '',
        category: tableData.category || 'Desenvolvimento',
        definition: tableData.definition || '',
        phonetic: tableData.phonetic || '',
        slang: tableData.slang,
        translation: tableData.translation || '',
        examples: tableData.examples || [],
        analogies: tableData.analogies || [],
        practicalUsage: tableData.practicalUsage || { title: '', content: '' },
        relatedTerms: tableData.relatedTerms || []
      };

      await supabaseAdmin.from('terms').upsert({
        id: finalData.id,
        term: finalData.term,
        category: finalData.category,
        definition: finalData.definition,
        content: finalData,
        created_at: new Date().toISOString()
      });

      setFormErrors({ success: `✅ Termo "${finalData.term}" salvo com sucesso no banco!` });
      setTableData({ examples: [], analogies: [], relatedTerms: [], practicalUsage: { title: '', content: '' } });
      setMode(null);
      setSearchTerm('');
    } catch (error) {
      setFormErrors({ form: `❌ Erro ao salvar: ${error instanceof Error ? error.message : 'Desconhecido'}` });
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
      setFormErrors({ json: '❌ JSON inválido - verifique a sintaxe' });
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
      setFormErrors({ json: `❌ Erro: ${error instanceof Error ? error.message : 'Desconhecido'}` });
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
          {mode !== 'table' && (
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
                  className="px-8 py-3 bg-cyan-400 text-[#081019] font-bold rounded-full hover:shadow-[0_0_20px_-5px_#22d3ee] transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? '⏳' : '🔍'} Buscar/Gerar
                </button>
              </div>
            </div>
          )}

          {/* Visual Table Editor */}
          {mode === 'table' && (
            <div className="space-y-6">
              {/* Botão Voltar */}
              <button
                onClick={() => { setMode(null); setSearchTerm(''); }}
                className="text-slate-400 hover:text-slate-200 text-sm mb-4"
              >
                ← Voltar para busca
              </button>

              {/* TABELA VISUAL */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="space-y-2">
                    {/* Termo */}
                    <tr className="bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                      <td className="px-4 py-3 font-bold text-cyan-400 w-32">Termo</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={tableData.term || ''}
                          onChange={e => handleTableChange('term', e.target.value)}
                          className="w-full bg-[#081019] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRefreshField('term')}
                          disabled={loading}
                          className="text-lg hover:text-cyan-400 transition-colors disabled:opacity-50"
                        >
                          🔄
                        </button>
                      </td>
                    </tr>

                    {/* Full Term */}
                    <tr className="bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                      <td className="px-4 py-3 font-bold text-cyan-400 w-32">Termo Completo</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={tableData.fullTerm || ''}
                          onChange={e => handleTableChange('fullTerm', e.target.value)}
                          className="w-full bg-[#081019] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button disabled className="text-lg text-slate-600">🔄</button>
                      </td>
                    </tr>

                    {/* Categoria */}
                    <tr className="bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                      <td className="px-4 py-3 font-bold text-cyan-400 w-32">Categoria</td>
                      <td className="px-4 py-3">
                        <select
                          value={tableData.category || ''}
                          onChange={e => handleTableChange('category', e.target.value)}
                          className="w-full bg-[#081019] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                        >
                          <option>Desenvolvimento</option>
                          <option>Infraestrutura</option>
                          <option>Dados & IA</option>
                          <option>Segurança</option>
                          <option>Agile & Produto</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button disabled className="text-lg text-slate-600">🔄</button>
                      </td>
                    </tr>

                    {/* Pronúncia */}
                    <tr className="bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                      <td className="px-4 py-3 font-bold text-cyan-400 w-32">Pronúncia</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={tableData.phonetic || ''}
                          onChange={e => handleTableChange('phonetic', e.target.value)}
                          className="w-full bg-[#081019] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRefreshField('phonetic')}
                          disabled={loading}
                          className="text-lg hover:text-cyan-400 transition-colors disabled:opacity-50"
                        >
                          🔄
                        </button>
                      </td>
                    </tr>

                    {/* Gíria */}
                    <tr className="bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                      <td className="px-4 py-3 font-bold text-cyan-400 w-32">Gíria/Abrev.</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={tableData.slang || ''}
                          onChange={e => handleTableChange('slang', e.target.value)}
                          className="w-full bg-[#081019] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button disabled className="text-lg text-slate-600">🔄</button>
                      </td>
                    </tr>

                    {/* Tradução */}
                    <tr className="bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                      <td className="px-4 py-3 font-bold text-cyan-400 w-32">Tradução (PT)</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={tableData.translation || ''}
                          onChange={e => handleTableChange('translation', e.target.value)}
                          className="w-full bg-[#081019] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRefreshField('translation')}
                          disabled={loading}
                          className="text-lg hover:text-cyan-400 transition-colors disabled:opacity-50"
                        >
                          🔄
                        </button>
                      </td>
                    </tr>

                    {/* Definição */}
                    <tr className="bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                      <td className="px-4 py-3 font-bold text-cyan-400 w-32">Definição</td>
                      <td className="px-4 py-3">
                        <textarea
                          value={tableData.definition || ''}
                          onChange={e => handleTableChange('definition', e.target.value)}
                          rows={3}
                          className="w-full bg-[#081019] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRefreshField('definition')}
                          disabled={loading}
                          className="text-lg hover:text-cyan-400 transition-colors disabled:opacity-50"
                        >
                          🔄
                        </button>
                      </td>
                    </tr>

                    {/* Termos Relacionados */}
                    <tr className="bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                      <td className="px-4 py-3 font-bold text-cyan-400 w-32">Termos Relacionados</td>
                      <td className="px-4 py-3 space-y-2">
                        {[0, 1, 2, 3].map(idx => (
                          <input
                            key={idx}
                            type="text"
                            value={(tableData.relatedTerms?.[idx]) || ''}
                            onChange={e => handleRelatedTermChange(idx, e.target.value)}
                            placeholder={`Termo ${idx + 1}`}
                            className="w-full bg-[#081019] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-sm"
                          />
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button disabled className="text-lg text-slate-600">🔄</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Exemplos */}
              <div className="mt-6 p-4 bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                <h4 className="font-bold text-cyan-400 mb-3">Exemplos</h4>
                {[0, 1].map(idx => (
                  <div key={idx} className="mb-4 p-3 bg-[#081019] border border-[#1E293B] rounded">
                    <input
                      type="text"
                      value={(tableData.examples?.[idx]?.title) || ''}
                      onChange={e => handleArrayItemChange('examples', idx, 'title', e.target.value)}
                      placeholder="Título do exemplo"
                      className="w-full bg-[#0E1625] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-sm mb-2"
                    />
                    <textarea
                      value={(tableData.examples?.[idx]?.description) || ''}
                      onChange={e => handleArrayItemChange('examples', idx, 'description', e.target.value)}
                      placeholder="Descrição do exemplo"
                      rows={2}
                      className="w-full bg-[#0E1625] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Analogias */}
              <div className="p-4 bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                <h4 className="font-bold text-cyan-400 mb-3">Analogias</h4>
                {[0, 1].map(idx => (
                  <div key={idx} className="mb-4 p-3 bg-[#081019] border border-[#1E293B] rounded">
                    <input
                      type="text"
                      value={(tableData.analogies?.[idx]?.title) || ''}
                      onChange={e => handleArrayItemChange('analogies', idx, 'title', e.target.value)}
                      placeholder="Título da analogia"
                      className="w-full bg-[#0E1625] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-sm mb-2"
                    />
                    <textarea
                      value={(tableData.analogies?.[idx]?.description) || ''}
                      onChange={e => handleArrayItemChange('analogies', idx, 'description', e.target.value)}
                      placeholder="Descrição da analogia"
                      rows={2}
                      className="w-full bg-[#0E1625] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Uso Prático */}
              <div className="p-4 bg-[#081019]/50 border border-[#1E293B] rounded-lg">
                <h4 className="font-bold text-cyan-400 mb-3">Uso Prático</h4>
                <input
                  type="text"
                  value={tableData.practicalUsage?.title || ''}
                  onChange={e => handleTableChange('practicalUsage', { ...tableData.practicalUsage, title: e.target.value })}
                  placeholder="Título do uso prático"
                  className="w-full bg-[#081019] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-sm mb-2"
                />
                <textarea
                  value={tableData.practicalUsage?.content || ''}
                  onChange={e => handleTableChange('practicalUsage', { ...tableData.practicalUsage, content: e.target.value })}
                  placeholder="Conteúdo/código do uso prático"
                  rows={3}
                  className="w-full bg-[#081019] border border-[#1E293B] rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-sm font-mono"
                />
              </div>

              {/* Botão Enviar */}
              <button
                onClick={handleSaveTerm}
                disabled={loading}
                className="w-full px-6 py-4 bg-cyan-400 text-[#081019] font-bold rounded-full hover:shadow-[0_0_20px_-5px_#22d3ee] transition-all duration-300 disabled:opacity-50 text-lg"
              >
                {loading ? '⏳ Salvando...' : '📤 Enviar para o Banco de Dados'}
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
            Cole um JSON válido ou array de termos (modelo pré-preenchido abaixo)
          </label>
          <textarea
            value={jsonInput}
            onChange={e => handleJsonChange(e.target.value)}
            rows={12}
            className={`w-full bg-[#081019] border ${
              jsonValid ? 'border-[#1E293B]' : 'border-red-500'
            } rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 font-mono text-xs`}
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
          <p>DESBUGUEI Admin Console • Backend Management • v2.0</p>
        </footer>
      </div>
    </div>
  );
};
