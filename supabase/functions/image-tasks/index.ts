// Edge function: recebe imagem (base64) + contexto (áreas, tags, data) e devolve
// uma lista estruturada de tarefas usando Lovable AI (Gemini visão) com tool calling.
// A imagem NÃO é persistida em lugar nenhum — vai direto pro modelo e o request é descartado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-password, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const expected = Deno.env.get("APP_PASSWORD");
  if (!expected) {
    return new Response(JSON.stringify({ error: "APP_PASSWORD not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const provided = req.headers.get("x-app-password");
  if (!provided || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

interface AreaCtx { id: string; name: string; }
interface TagCtx { id: string; name: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authFail = await requireAuth(req);
  if (authFail) return authFail;


  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const imageBase64: string | undefined = body?.image;
    const mimeType: string = body?.mimeType || "image/jpeg";
    const hint: string = typeof body?.hint === "string" ? body.hint : "";
    const areas: AreaCtx[] = Array.isArray(body?.areas) ? body.areas : [];
    const tags: TagCtx[] = Array.isArray(body?.tags) ? body.tags : [];
    const todayStr: string = body?.today || new Date().toISOString().slice(0, 10);

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Campo 'image' (base64) é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (areas.length === 0) {
      return new Response(JSON.stringify({ error: "Lista de áreas é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const areaList = areas.map((a) => `- ${a.name} (id: ${a.id})`).join("\n");
    const tagList = tags.length
      ? tags.map((t) => `- ${t.name} (id: ${t.id})`).join("\n")
      : "(sem etiquetas pré-cadastradas)";

    const systemPrompt = `Você é um assistente que olha uma IMAGEM e extrai tarefas estruturadas para um app de produtividade em PT-BR.

A imagem pode ser: uma foto de lista escrita à mão, um print de chat/email, um screenshot de um quadro, um print de calendário, um post-it, uma captura de tela qualquer, etc.

Áreas disponíveis no app:
${areaList}

Etiquetas disponíveis:
${tagList}

Data de hoje: ${todayStr}

Regras:
1. Identifique TODAS as tarefas/ações visíveis na imagem (pode ser uma ou várias).
2. Para cada uma, gere um título CURTO e DIRETO no infinitivo (ex: "trocar nome da home", "responder cliente", "comprar leite"). Capitalize só a primeira letra.
3. Atribua a melhor área dentre as disponíveis (use o "id" exato). Se ambíguo, escolha a mais coerente.
4. Se a imagem mostrar prazo ("amanhã", "sexta", "30/05", "às 14h"), preencha dueDate (YYYY-MM-DD) e/ou dueTime (HH:MM 24h). Se não, deixe vazio.
5. Prioridade: urgent | high | medium | low | none. Padrão: none. Use urgent/high se a imagem indicar urgência ("URGENTE", "!!!", marcações vermelhas).
6. Etiquetas: só atribua se houver match claro com as disponíveis (use ids).
7. Se não conseguir identificar nenhuma tarefa, retorne lista vazia.
8. NÃO invente conteúdo que não está na imagem.`;

    const userParts: any[] = [
      { type: "text", text: hint ? `Extraia tarefas desta imagem. Contexto extra do usuário: ${hint}` : "Extraia as tarefas desta imagem:" },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userParts },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_tasks",
              description: "Devolve a lista estruturada de tarefas extraídas da imagem.",
              parameters: {
                type: "object",
                properties: {
                  description: { type: "string", description: "Descrição curta do que foi visto na imagem (debug)." },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        areaId: { type: "string" },
                        dueDate: { type: "string", description: "YYYY-MM-DD ou string vazia." },
                        dueTime: { type: "string", description: "HH:MM (24h) ou string vazia." },
                        priority: { type: "string", enum: ["none", "low", "medium", "high", "urgent"] },
                        tagIds: { type: "array", items: { type: "string" } },
                      },
                      required: ["title", "areaId", "dueDate", "dueTime", "priority", "tagIds"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["description", "tasks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_tasks" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos do Lovable AI esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao processar imagem" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { description?: string; tasks?: any[] } = { description: "", tasks: [] };
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); }
      catch (e) { console.error("Failed to parse tool arguments:", e); }
    }

    const validAreaIds = new Set(areas.map((a) => a.id));
    const validTagIds = new Set(tags.map((t) => t.id));
    const fallbackAreaId = areas[0]?.id || "";
    const tasks = (parsed.tasks || []).map((t: any) => ({
      title: String(t.title || "").trim(),
      areaId: validAreaIds.has(t.areaId) ? t.areaId : fallbackAreaId,
      dueDate: t.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : "",
      dueTime: t.dueTime && /^\d{2}:\d{2}$/.test(t.dueTime) ? t.dueTime : "",
      priority: ["none", "low", "medium", "high", "urgent"].includes(t.priority) ? t.priority : "none",
      tagIds: Array.isArray(t.tagIds) ? t.tagIds.filter((id: string) => validTagIds.has(id)) : [],
    })).filter((t: any) => t.title.length > 0);

    return new Response(JSON.stringify({ description: parsed.description || "", tasks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("image-tasks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
