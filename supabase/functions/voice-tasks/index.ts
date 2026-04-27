// Edge function: recebe áudio + contexto (áreas, tags, data atual) e devolve
// uma lista estruturada de tarefas usando Lovable AI (Gemini) com tool calling.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AreaCtx { id: string; name: string; }
interface TagCtx { id: string; name: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const audioBase64: string | undefined = body?.audio;
    const mimeType: string = body?.mimeType || "audio/webm";
    const areas: AreaCtx[] = Array.isArray(body?.areas) ? body.areas : [];
    const tags: TagCtx[] = Array.isArray(body?.tags) ? body.tags : [];
    const todayStr: string = body?.today || new Date().toISOString().slice(0, 10);

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Campo 'audio' (base64) é obrigatório" }), {
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

    const systemPrompt = `Você é um assistente que transforma fala em tarefas estruturadas para um app de produtividade em português do Brasil.

Áreas disponíveis no app:
${areaList}

Etiquetas disponíveis:
${tagList}

Data de hoje: ${todayStr}

Regras:
1. Transcreva o áudio mentalmente e extraia TODAS as tarefas mencionadas (pode ser uma ou várias).
2. Para cada tarefa, gere um título CURTO e DIRETO no infinitivo (ex: "trocar nome da home", "criar seção nova", "gerar arte"). Remova frases tipo "eu preciso", "tenho que", "lembrar de".
3. Capitalize só a primeira letra do título.
4. Atribua a melhor área a partir das disponíveis. Se o usuário não especificar, escolha a área mais coerente com o conteúdo das tarefas. Use sempre o "id" exato da área.
5. Se o usuário mencionar prazo (ex: "amanhã", "sexta", "dia 30", "às 14h"), preencha dueDate (YYYY-MM-DD) e/ou dueTime (HH:MM, 24h). Caso contrário, deixe em branco.
6. Se o usuário mencionar prioridade ("urgente", "importante", "alta", "baixa"), use os valores: urgent | high | medium | low | none. Padrão: none.
7. Etiquetas: só atribua se houver match claro com as disponíveis (use os ids).
8. Se NÃO houver fala ou nenhuma tarefa identificada, retorne lista vazia.
9. NÃO invente áreas, etiquetas ou prazos. Use apenas o que está explícito ou claramente implícito.`;

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
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia as tarefas deste áudio:" },
              {
                type: "input_audio",
                input_audio: { data: audioBase64, format: mimeType.includes("mp3") ? "mp3" : "webm" },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_tasks",
              description: "Devolve a lista estruturada de tarefas extraídas da fala do usuário.",
              parameters: {
                type: "object",
                properties: {
                  transcript: {
                    type: "string",
                    description: "Transcrição literal do que foi dito (pra debug/exibição).",
                  },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Título curto e direto." },
                        areaId: { type: "string", description: "Id da área escolhida." },
                        dueDate: { type: "string", description: "YYYY-MM-DD ou string vazia." },
                        dueTime: { type: "string", description: "HH:MM (24h) ou string vazia." },
                        priority: {
                          type: "string",
                          enum: ["none", "low", "medium", "high", "urgent"],
                        },
                        tagIds: {
                          type: "array",
                          items: { type: "string" },
                          description: "Ids das etiquetas (pode ser vazio).",
                        },
                      },
                      required: ["title", "areaId", "dueDate", "dueTime", "priority", "tagIds"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["transcript", "tasks"],
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos do Lovable AI esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao processar áudio" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { transcript?: string; tasks?: any[] } = { transcript: "", tasks: [] };
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool arguments:", e, toolCall.function.arguments);
      }
    }

    // Sanitize: garantir áreaId válido
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

    return new Response(JSON.stringify({ transcript: parsed.transcript || "", tasks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-tasks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
