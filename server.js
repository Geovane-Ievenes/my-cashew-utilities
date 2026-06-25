const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static('public'));

// Rota unificada para buscar dados das perguntas salvas no Metabase
app.post('/obter-id', async (req, res) => {
    try {
        const REAL_API_KEY = process.env.METABASE_SECRET_KEY;
        const METABASE_IP = process.env.METABASE_IP;
        const METABASE_PORT = process.env.METABASE_PORT;
        
        // IDs das perguntas configuradas no .env
        const cards = {
            'ID_PESSOAL': process.env.METABASE_CARD_ID_COMPRAS_PESSOAL,
            'ID_NEGOCIOS': process.env.METABASE_CARD_ID_COMPRAS_NEGOCIOS,
            'CAT_PESSOAL': process.env.METABASE_CARD_ID_CATEGORIAS_PESSOAL,
            'CAT_NEGOCIOS': process.env.METABASE_CARD_ID_CATEGORIAS_NEGOCIOS
        };

        if (!REAL_API_KEY || !METABASE_IP || !METABASE_PORT) {
            return res.status(500).json({ error: "Configurações de conexão do Metabase ausentes no .env." });
        }

        const { tipoRequisicao, prefixo } = req.body;
        let cardId = null;

        // Determina qual Card ID chamar com base no que o Frontend pediu
        if (tipoRequisicao === 'buscar_id') {
            cardId = prefixo === '#NL' ? cards.ID_NEGOCIOS : cards.ID_PESSOAL;
        } else if (tipoRequisicao === 'buscar_categorias') {
            cardId = prefixo === '#NL' ? cards.CAT_NEGOCIOS : cards.CAT_PESSOAL;
        }

        if (!cardId) {
            return res.status(400).json({ error: `O ID da pergunta salva correspondente não foi configurado no arquivo .env.` });
        }

        // Endpoint oficial do Metabase para executar perguntas salvas (Cards)
        const urlMetabase = `http://${METABASE_IP}:${METABASE_PORT}/api/card/${cardId}/query`;

        const response = await fetch(urlMetabase, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': REAL_API_KEY
            },
            // Se a sua pergunta salva usar filtros de URL no Metabase, passamos aqui.
            // Caso contrário, o Metabase apenas executará a consulta trancada.
            body: JSON.stringify(prefixo ? { "parameters": [{ "type": "category", "target": ["variable", ["template-tag", "prefixo"]], "value": prefixo }] } : {})
        });

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: `O Metabase retornou status HTTP ${response.status} ao executar a pergunta ID ${cardId}.` 
            });
        }

        const dados = await response.json();
        return res.json(dados);

    } catch (erro) {
        return res.status(500).json({ 
            error: `Erro de comunicação interna com a infraestrutura local: ${erro.message}` 
        });
    }
});

app.listen(PORT, () => {
    console.log(`?? Servidor Cashew rodando em http://localhost:${PORT}`);
});