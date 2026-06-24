export async function onRequestPost(context) {
    // Configurações de CORS para o navegador não bloquear a resposta
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    };

    try {
        // Captura as 3 variáveis dinâmicas do painel da Cloudflare
        const REAL_API_KEY = context.env.METABASE_SECRET_KEY;
        const METABASE_IP = context.env.METABASE_IP;
        const METABASE_PORT = context.env.METABASE_PORT;

        // Validação 1: Verifica se as variáveis foram realmente definidas no painel
        if (!REAL_API_KEY) {
            return new Response(JSON.stringify({ error: "A variável 'METABASE_SECRET_KEY' não está configurada no Cloudflare." }), { status: 500, headers });
        }
        if (!METABASE_IP) {
            return new Response(JSON.stringify({ error: "A variável 'METABASE_IP' não está configurada no Cloudflare." }), { status: 500, headers });
        }
        if (!METABASE_PORT) {
            return new Response(JSON.stringify({ error: "A variável 'METABASE_PORT' não está configurada no Cloudflare." }), { status: 500, headers });
        }

        const corpoRequisicao = await context.request.json().catch(() => ({}));
        const databaseId = corpoRequisicao.database || 1;
        
        // Segurança: Garante que o banco só receba os prefixos oficiais, evitando SQL Injection
        const prefixo = corpoRequisicao.prefixo === '#NL' ? '#NL' : '#NO';

        // Monta a URL dinamicamente usando as variáveis
        const urlMetabase = `http://${METABASE_IP}:${METABASE_PORT}/api/dataset`;

        let response;
        try {
            // Tenta disparar a requisição para o Metabase
            response = await fetch(urlMetabase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': REAL_API_KEY
                },
                body: JSON.stringify({
                    "database": databaseId,
                    "type": "native",
                    "native": {
                        "query": `SELECT MAX(CAST(SUBSTR(name, INSTR(name, '${prefixo}') + 3, 5) AS INTEGER)) FROM transactions WHERE name LIKE '%${prefixo}%';`
                    }
                })
            });
        } catch (erroDeRede) {
            // Validação 2: Se o fetch explodir (Network Error, DNS, IP errado, Túnel offline)
            throw new Error(`Não foi possível conectar ao endereço ${urlMetabase}. Verifique se os valores de METABASE_IP e METABASE_PORT estão corretos nas variáveis, e se o seu servidor/túnel está online. Detalhe técnico: ${erroDeRede.message}`);
        }

        // Validação 3: Se o servidor respondeu, mas deu erro 401, 403, 500, etc.
        if (!response.ok) {
            throw new Error(`O servidor Metabase foi encontrado no IP ${METABASE_IP}:${METABASE_PORT}, mas retornou um Erro HTTP ${response.status}. Verifique se a sua SECRET_KEY está correta.`);
        }

        const dados = await response.json();
        
        // Devolve o sucesso limpo para o front
        return new Response(JSON.stringify(dados), { headers });

    } catch (erro) {
        // Pega qualquer throw new Error lá de cima e cospe como JSON para o botão INFO do frontend ler
        return new Response(JSON.stringify({ error: erro.message }), { status: 500, headers });
    }
}

// Trata requisições de teste (Preflight OPTIONS) automáticas que alguns navegadores fazem
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}