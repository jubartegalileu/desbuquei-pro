import React, { useState, useEffect } from 'react';
import { isSupabaseConfigured } from '../services/supabase';
import {
  listAllTerms,
  createTerm,
  updateTerm,
  deleteTerm,
} from '../services/adminService';
import { TermData } from '../types';

const ADMIN_PIN = 'LuMa240545!521';

export const Upload = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  // Estados do painel admin
  const [terms, setTerms] = useState<TermData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TermData | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Verificar se já está autenticado (sessionStorage)
  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setError('');
    } else {
      setError('Senha incorreta');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_auth');
  };

  const loadTerms = async () => {
    setLoading(true);
    try {
      const data = await listAllTerms({ limit: 100 });
      setTerms(data);
    } catch (err) {
      console.error('Erro ao carregar termos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTerms();
    }
  }, [isAuthenticated]);

  // Renderizar tela de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-100 mb-2">
              Área Administrativa
            </h1>
            <p className="text-slate-400 text-sm">
              Acesso restrito para gerenciamento do banco de conhecimento
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Código de Acesso
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="Digite o PIN"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Acessar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Renderizar painel admin (após autenticação)
  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 pb-32">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-slate-100">
            Painel Administrativo
          </h2>
          <p className="text-slate-400 mt-2">
            Gerencie os termos do banco de conhecimento
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm"
        >
          Sair
        </button>
      </header>

      {!isSupabaseConfigured() && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400">
            ⚠️ Supabase não configurado. Configure as variáveis de ambiente.
          </p>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingTerm(null);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Adicionar Novo Termo'}
        </button>
      </div>

      {showForm && (
        <TermFormComponent
          term={editingTerm}
          onSave={async (termData) => {
            try {
              if (editingTerm) {
                await updateTerm(editingTerm.id, termData);
              } else {
                await createTerm(termData);
              }
              await loadTerms();
              setShowForm(false);
              setEditingTerm(null);
            } catch (err) {
              alert('Erro ao salvar termo: ' + (err as Error).message);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingTerm(null);
          }}
        />
      )}

      <TermsTableComponent
        terms={terms}
        loading={loading}
        onEdit={(term) => {
          setEditingTerm(term);
          setShowForm(true);
        }}
        onDelete={async (id) => {
          if (confirm('Tem certeza que deseja excluir este termo?')) {
            try {
              await deleteTerm(id);
              await loadTerms();
            } catch (err) {
              alert('Erro ao excluir termo');
            }
          }
        }}
        onRefresh={loadTerms}
      />
    </div>
  );
};

interface TermFormProps {
  term: TermData | null;
  onSave: (termData: TermData) => Promise<void>;
  onCancel: () => void;
}

const TermFormComponent: React.FC<TermFormProps> = ({
  term,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<TermData>(
    term || {
      id: '',
      term: '',
      fullTerm: '',
      category: 'Desenvolvimento',
      definition: '',
      phonetic: '',
      slang: '',
      translation: '',
      examples: [],
      analogies: [],
      practicalUsage: { title: '', content: '' },
      relatedTerms: [],
    }
  );

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id || !formData.term || !formData.definition) {
      alert('Preencha os campos obrigatórios: ID, Termo e Definição');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    'Desenvolvimento',
    'Infraestrutura',
    'Dados & IA',
    'Segurança',
    'Agile & Produto',
  ];

  return (
    <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
      <h3 className="text-xl font-bold text-slate-100 mb-6">
        {term ? 'Editar Termo' : 'Novo Termo'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ID */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              ID (sem espaços) *
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  id: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                })
              }
              disabled={!!term}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 disabled:opacity-50"
              placeholder="ex: api-rest"
            />
          </div>

          {/* Termo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Termo *
            </label>
            <input
              type="text"
              value={formData.term}
              onChange={(e) => setFormData({ ...formData, term: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100"
              placeholder="ex: API REST"
            />
          </div>

          {/* Full Term */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Expansão Completa
            </label>
            <input
              type="text"
              value={formData.fullTerm}
              onChange={(e) =>
                setFormData({ ...formData, fullTerm: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100"
              placeholder="ex: Representational State Transfer"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Categoria
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Pronúncia */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pronúncia
            </label>
            <input
              type="text"
              value={formData.phonetic}
              onChange={(e) =>
                setFormData({ ...formData, phonetic: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100"
              placeholder="ex: A-pi-rrê"
            />
          </div>

          {/* Tradução */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tradução Livre
            </label>
            <input
              type="text"
              value={formData.translation}
              onChange={(e) =>
                setFormData({ ...formData, translation: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100"
              placeholder="ex: TRANSFERÊNCIA DE ESTADO REPRESENTATIVO"
            />
          </div>
        </div>

        {/* Gíria */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Gíria/Expressão
          </label>
          <input
            type="text"
            value={formData.slang}
            onChange={(e) => setFormData({ ...formData, slang: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100"
            placeholder="ex: a forma padrão dos devs conversarem"
          />
        </div>

        {/* Definição */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Definição *
          </label>
          <textarea
            value={formData.definition}
            onChange={(e) =>
              setFormData({ ...formData, definition: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 h-24"
            placeholder="Explicação principal do termo"
          />
        </div>

        {/* Termos Relacionados */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Termos Relacionados (separados por vírgula)
          </label>
          <input
            type="text"
            value={formData.relatedTerms.join(', ')}
            onChange={(e) =>
              setFormData({
                ...formData,
                relatedTerms: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100"
            placeholder="ex: HTTP, REST, XML"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Salvando...' : term ? 'Atualizar' : 'Criar'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

interface TermsTableProps {
  terms: TermData[];
  loading: boolean;
  onEdit: (term: TermData) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const TermsTableComponent: React.FC<TermsTableProps> = ({
  terms,
  loading,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-100">
          Termos Cadastrados ({terms.length})
        </h3>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          🔄 Atualizar
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">
          Carregando termos...
        </div>
      ) : terms.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          Nenhum termo cadastrado. Comece adicionando um novo!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-slate-300 font-medium text-sm">
                  Termo
                </th>
                <th className="px-4 py-3 text-left text-slate-300 font-medium text-sm">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-slate-300 font-medium text-sm">
                  Definição
                </th>
                <th className="px-4 py-3 text-right text-slate-300 font-medium text-sm">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term) => (
                <tr
                  key={term.id}
                  className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-100 font-medium">
                    {term.term}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {term.category}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm truncate max-w-md">
                    {term.definition.substring(0, 80)}...
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => onEdit(term)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(term.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
