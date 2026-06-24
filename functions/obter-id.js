export async function onRequestPost(context) {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    };

    try {
        const REAL_API_KEY = context.env.METABASE_SECRET_KEY;
        const METABASE_IP = context.env.METABASE_IP;
        const METABASE_PORT = context.env.METABASE_PORT;
        const METABASE_DB_ID = context.env.METABASE_DB_ID;

        if (!REAL_API_KEY) {
            return new Response(JSON.stringify({ error: "A variável 'METABASE_SECRET_KEY' não está configurada no Cloudflare." }), { status: 500, headers });
        }
        if (!METABASE_IP) {
            return new Response(JSON.stringify({ error: "A variável 'METABASE_IP' não está configurada no Cloudflare." }), { status: 500, headers });
        }
        if (!METABASE_PORT) {
            return new Response(JSON.stringify({ error: "A variável 'METABASE_PORT' não está configurada no Cloudflare." }), { status: 500, headers });
        }
        if (!METABASE_DB_ID) {
            return new Response(JSON.stringify({ error: "A variável 'METABASE_DB_ID' não está configurada no Cloudflare." }), { status: 500, headers });
        }

        const corpoRequisicao = await context.request.json().catch(() => ({}));
        const prefixo = corpoRequisicao.prefixo === '#NL' ? '#NL' : '#NO';

        const urlMetabase = `http://${METABASE_IP}:${METABASE_PORT}/api/dataset`;

        let response;
        try {
            response = await fetch(urlMetabase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': REAL_API_KEY
                },
                body: JSON.stringify({
                    "database": parseInt(METABASE_DB_ID), // Usando a variável do Cloudflare convertida para número
                    "type": "native",
                    "native": {
                        "query": `SELECT MAX(CAST(SUBSTR(name, INSTR(name, '${prefixo}') + 3, 5) AS INTEGER)) FROM transactions WHERE name LIKE '%${prefixo}%';`
                    }
                })
            });
        } catch (erroDeRede) {
            throw new Error(`Não foi possível conectar ao endereço ${urlMetabase}. Verifique se os valores de IP e Porta estão corretos, e se o seu servidor/túnel está online. Detalhe técnico: ${erroDeRede.message}`);
        }

        if (!response.ok) {
            throw new Error(`O servidor Metabase foi encontrado, mas retornou um Erro HTTP ${response.status}. Verifique se a sua SECRET_KEY e o DB_ID estão corretos.`);
        }

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