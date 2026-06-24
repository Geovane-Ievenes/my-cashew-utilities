export async function onRequestPost(context) {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    };

    try {
        const REAL_API_KEY = context.env.METABASE_SECRET_KEY;
        if (!REAL_API_KEY) {
            return new Response(JSON.stringify({ error: "Chave secreta não configurada." }), { status: 500, headers });
        }

        const corpoRequisicao = await context.request.json().catch(() => ({}));
        const databaseId = corpoRequisicao.database || 1;
        
        // Segurança: Garante que o banco só receba os prefixos oficiais, evitando SQL Injection
        const prefixo = corpoRequisicao.prefixo === '#NL' ? '#NL' : '#NO';

        const response = await fetch('http://192.168.0.105:3000/api/dataset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': REAL_API_KEY
            },
            body: JSON.stringify({
                "database": databaseId,
                "type": "native",
                "native": {
                    // Agora a Query busca dinamicamente a ID mais alta da categoria selecionada
                    "query": `SELECT MAX(CAST(SUBSTR(name, INSTR(name, '${prefixo}') + 3, 5) AS INTEGER)) FROM transactions WHERE name LIKE '%${prefixo}%';`
                }
            })
        });

        if (!response.ok) throw new Error(`Metabase respondeu com status ${response.status}`);
        const dados = await response.json();
        
        return new Response(JSON.stringify(dados), { headers });

    } catch (erro) {
        return new Response(JSON.stringify({ error: erro.message }), { status: 500, headers });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}