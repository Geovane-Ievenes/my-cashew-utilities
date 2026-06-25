const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static('public'));

app.post('/obter-id', async (req, res) => {
    try {
        const REAL_API_KEY = process.env.METABASE_SECRET_KEY;
        const METABASE_IP = process.env.METABASE_IP;
        const METABASE_PORT = process.env.METABASE_PORT;
        
        const cards = {
            'ID_PESSOAL': process.env.METABASE_CARD_ID_COMPRAS_PESSOAL,
            'ID_NEGOCIOS': process.env.METABASE_CARD_ID_COMPRAS_NEGOCIOS,
            'CAT_PESSOAL': process.env.METABASE_CARD_ID_CATEGORIAS_PESSOAL,
            'CAT_NEGOCIOS': process.env.METABASE_CARD_ID_CATEGORIAS_NEGOCIOS
        };

        const { tipoRequisicao, prefixo } = req.body;
        let cardId = null;

        // CORREÇÃO: Ambos #NO (Online) e #NL (Física) são de NEGÓCIOS!
        const isNegocios = (prefixo === '#NL' || prefixo === '#NO');

        if (tipoRequisicao === 'buscar_id') {
            cardId = isNegocios ? cards.ID_NEGOCIOS : cards.ID_PESSOAL;
        } else if (tipoRequisicao === 'buscar_categorias') {
            cardId = isNegocios ? cards.CAT_NEGOCIOS : cards.CAT_PESSOAL;
        }

        if (!cardId) {
            return res.status(400).json({ error: `O ID da pergunta salva não foi configurado no arquivo .env.` });
        }

        const urlMetabase = `http://${METABASE_IP}:${METABASE_PORT}/api/card/${cardId}/query`;

        // Monta os parâmetros exatamente no formato que a API do Metabase exige
        let requestBody = {};
        if (prefixo) {
            requestBody = {
                "parameters": [
                    {
                        "type": "text", 
                        "target": ["variable", ["template-tag", "prefixo"]],
                        "value": prefixo
                    }
                ]
            };
        }

        const response = await fetch(urlMetabase, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': REAL_API_KEY
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: `O Metabase retornou status HTTP ${response.status} ao executar a pergunta ID ${cardId}.` 
            });
        }

        const dados = await response.json();
        
        // LOG PARA DEBUG: Imprime no Termux o que o Metabase achou no banco
        if (tipoRequisicao === 'buscar_id') {
            console.log(`[DEBUG] A busca pelo ID ${prefixo} retornou:`, JSON.stringify(dados?.data?.rows));
        }

        return res.json(dados);

    } catch (erro) {
        return res.status(500).json({ 
            error: `Erro interno no servidor Node: ${erro.message}` 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor Cashew rodando em http://localhost:${PORT}`);
});