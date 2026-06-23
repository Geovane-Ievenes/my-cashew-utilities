export async function onRequestPost(context) {
    // Configura os cabeçalhos para evitar qualquer bloqueio no navegador (CORS)
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    };

    try {
        // Captura a Secret armazenada com segurança no painel do Cloudflare Pages
        const REAL_API_KEY = context.env.METABASE_SECRET_KEY;

        if (!REAL_API_KEY) {
            return new Response(JSON.stringify({ error: "Chave secreta não configurada no servidor." }), { status: 500, headers });
        }

        // Recupera o corpo da requisição enviado pelo HTML (ex: se passar o database id)
        const corpoRequisicao = await context.request.json().catch(() => ({}));
        const databaseId = corpoRequisicao.database || 1;

        // O próprio servidor do Cloudflare faz a chamada para o seu Metabase de forma oculta
        const response = await fetch('http://seu-servidor-metabase:3000/api/dataset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': REAL_API_KEY // Injeta a chave real aqui no ambiente seguro do servidor
            },
            body: JSON.stringify({
                "database": databaseId,
                "type": "native",
                "native": {
                    "query": "SELECT MAX(CAST(SUBSTR(name, INSTR(name, '#') + 3, 5) AS INTEGER)) FROM transactions WHERE name LIKE '%#NO%' OR name LIKE '%#NL%';"
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Metabase respondeu com status ${response.status}`);
        }

        const dados = await response.json();
        
        // Devolve apenas o resultado da query limpo para o seu HTML
        return new Response(JSON.stringify(dados), { headers });

    } catch (erro) {
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