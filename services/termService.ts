import { GoogleGenAI, Type } from "@google/genai";
import { TermData } from "../types";
import { supabase, isSupabaseConfigured } from "./supabase";

// 1. MOCK DATABASE (Fallback if Supabase is offline)
const localDatabase: Record<string, TermData> = {
  "api": {
    id: "api",
    term: "API",
    fullTerm: "Application Programming Interface",
    category: "Desenvolvimento",
    definition: "APIs permitem que diferentes sistemas de software conversem entre si automaticamente, eliminando tarefas manuais e conectando sua empresa ao mercado digital.",
    phonetic: "Ei-pi-ai",
    slang: undefined,
    translation: "INTERFACE DE PROGRAMAÇÃO DE APLICATIVOS",
    examples: [
      { title: "AUTOMAÇÃO DE FLUXOS", description: "Elimina a intervenção humana ao conectar processos operacionais críticos." },
      { title: "SINCRONIZAÇÃO DE DADOS", description: "Mantém Vendas, RH e Financeiro atualizados em todas as plataformas." }
    ],
    analogies: [
      { title: "O GARÇOM NO RESTAURANTE", description: "Você (cliente) pede ao garçom (API), que leva o pedido à cozinha (sistema) e traz o prato." },
      { title: "TOMADA UNIVERSAL", description: "Interface padrão para conectar qualquer aparelho à energia sem saber como a rede funciona." }
    ],
    practicalUsage: {
      title: "Na reunião de alinhamento (Daily)",
      content: "Pessoal, a API de pagamentos caiu porque o gateway mudou a autenticação. Vou precisar refatorar a integração hoje à tarde pra gente voltar a vender."
    },
    relatedTerms: ["Endpoint", "JSON", "REST", "Webhook", "Gateway", "SDK"]
  }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to normalize IDs (e.g. "React JS" -> "react-js")
const normalizeId = (text: string) => {
    return text.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
}

export const getTermData = async (termId: string): Promise<TermData> => {
  // Use simple lowercase for checking localDB/keys, but slugify for DB
  const rawId = termId.toLowerCase().trim();
  const dbId = normalizeId(termId);

  // 1. STRATEGY: READ-THROUGH CACHING (Supabase -> Cache Miss -> Gemini -> Save)

  // A. Check Supabase (The Source of Truth)
  if (isSupabaseConfigured()) {
      try {
          const { data, error } = await supabase
            .from('terms')
            .select('*')
            .eq('id', dbId)
            .single();

          if (data && data.content) {
              console.log("✅ Hit from Supabase:", dbId);
              return data.content as TermData;
          }
      } catch (err) {
          // Silent fail - proceed to AI generation
          console.warn("Supabase fetch miss or error, falling back to AI/Local");
      }
  }

  // B. Fallback to Local Mock (Instant response for demos/offline)
  if (localDatabase[rawId]) {
    return localDatabase[rawId];
  }

  // C. Generate with Gemini (Cache Miss)
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: `You are a technical glossary for business executives. Define the term "${termId}".
      
      Requirements:
      1. 'fullTerm': The full English name or expansion.
      2. 'translation': Translate the essence to Portuguese.
      3. 'definition': A clear, business-focused definition in Portuguese.
      4. 'phonetic': Portuguese pronunciation hint.
      5. 'slang': Common slang (or null).
      6. 'examples': 2 business contexts.
      7. 'analogies': 2 simple analogies.
      8. 'practicalUsage': Realistic sentence in Portuguese used by developers.
      9. 'relatedTerms': Up to 6 related keywords.
      10. 'category': Pick one: Desenvolvimento, Infraestrutura, Dados & IA, Segurança, Agile & Produto.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            term: { type: Type.STRING },
            fullTerm: { type: Type.STRING },
            category: { type: Type.STRING },
            definition: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            slang: { type: Type.STRING, nullable: true },
            translation: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }
              }
            },
            analogies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }
              }
            },
            practicalUsage: {
              type: Type.OBJECT,
              properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }
            },
            relatedTerms: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    if (response.text) {
      // Limpar blocos de código Markdown se existirem (ex: ```json ... ```)
      let jsonStr = response.text.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
      } else if (jsonStr.startsWith('```')) {
         jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
      }
      
      const data = JSON.parse(jsonStr) as TermData;
      data.id = dbId; // Enforce consistent ID based on our normalization logic
      
      // Defaults to avoid null pointers in UI
      data.examples = Array.isArray(data.examples) ? data.examples : [];
      data.analogies = Array.isArray(data.analogies) ? data.analogies : [];
      data.relatedTerms = Array.isArray(data.relatedTerms) ? data.relatedTerms : [];
      data.fullTerm = data.fullTerm || data.term;
      if (!data.practicalUsage) {
         data.practicalUsage = { title: "Contexto Geral", content: "Termo usado frequentemente em reuniões de tecnologia." };
      }

      // D. Save to Supabase (Retroalimentação)
      // We perform this asynchronously so the user gets the result immediately.
      if (isSupabaseConfigured()) {
          // Using 'upsert' instead of 'insert' handles race conditions where two users
          // might search the same new term simultaneously.
          supabase.from('terms').upsert({
              id: dbId,
              term: data.term,
              category: data.category,
              definition: data.definition, // Plain text for easier search querying
              content: data, // The full JSON blob for the UI
              created_at: new Date().toISOString()
          }, { onConflict: 'id' }).then(({ error }) => {
              if (error) console.error("❌ Error saving to Supabase:", error);
              else console.log("💾 Saved to Supabase (Retro-feeding):", dbId);
          });
      }

      return data;
    }
  } catch (error) {
    console.error("AI Generation failed:", error);
  }

  throw new Error("Termo não encontrado.");
};

// --- SEEDING UTILITY ---
export const seedDatabase = async (onProgress: (log: string) => void) => {
    if (!isSupabaseConfigured()) {
        onProgress("ERRO: Supabase não configurado. Verifique suas variáveis de ambiente (VITE_SUPABASE_URL).");
        return;
    }

    const seedList = [
        "Kubernetes", "Docker", "CI/CD", "Microservices", "Serverless",
        "React", "Node.js", "Python", "Machine Learning", "LLM",
        "Cybersecurity", "Zero Trust", "Firewall", "VPN", "Encryption",
        "Agile", "Scrum", "Kanban", "MVP", "Product Market Fit"
    ];

    onProgress(`Iniciando carga de ${seedList.length} termos...`);

    for (const term of seedList) {
        onProgress(`Verificando/Gerando: ${term}...`);
        try {
            await getTermData(term);
            onProgress(`✅ ${term} processado.`);
        } catch (e) {
            onProgress(`❌ Erro ao processar ${term}.`);
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    onProgress("Carga finalizada!");
};