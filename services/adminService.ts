import { supabase, isSupabaseConfigured } from './supabase';
import { TermData } from '../types';

export async function listAllTerms(filters?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<TermData[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado');
  }

  let query = supabase.from('terms').select('*');

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.search) {
    query = query.or(
      `term.ilike.%${filters.search}%,definition.ilike.%${filters.search}%`
    );
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 10) - 1
    );
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;

  return data?.map((row) => row.content) || [];
}

export async function createTerm(termData: TermData): Promise<void> {
  console.log('createTerm chamado com:', termData);

  if (!isSupabaseConfigured()) {
    console.error('Supabase não configurado');
    throw new Error('Supabase não configurado');
  }

  console.log('Inserindo no Supabase...');
  const { data, error } = await supabase.from('terms').insert({
    id: termData.id,
    term: termData.term,
    category: termData.category,
    definition: termData.definition,
    content: termData,
    created_at: new Date().toISOString(),
  });

  console.log('Resposta do Supabase:', { data, error });

  if (error) {
    console.error('Erro ao inserir:', error);
    throw new Error(`Erro ao inserir termo: ${error.message}`);
  }

  console.log('Termo inserido com sucesso!');
}

export async function updateTerm(
  id: string,
  termData: Partial<TermData>
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado');
  }

  // Buscar termo atual
  const { data: currentTerm } = await supabase
    .from('terms')
    .select('content')
    .eq('id', id)
    .single();

  if (!currentTerm) {
    throw new Error('Termo não encontrado');
  }

  // Merge com dados novos
  const updated = { ...currentTerm.content, ...termData };

  const { error } = await supabase
    .from('terms')
    .update({
      term: updated.term,
      category: updated.category,
      definition: updated.definition,
      content: updated,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteTerm(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado');
  }

  const { error } = await supabase.from('terms').delete().eq('id', id);

  if (error) throw error;
}

export async function countTerms(filters?: {
  category?: string;
}): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  let query = supabase
    .from('terms')
    .select('id', { count: 'exact', head: true });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  const { count } = await query;
  return count || 0;
}
