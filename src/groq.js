const ENDERECO_DA_GROQ = 'https://api.groq.com/openai/v1/chat/completions';

/** Envia instruções e conteúdo à Groq e devolve a resposta já convertida de JSON para objeto. */
export async function perguntarAoGroq(instrucoes, conteudo) {
    const cabecalhos = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.GROQ_API_KEY,
    };

    const pedido = {
        model: process.env.GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: instrucoes },
            { role: 'user', content: conteudo },
        ],
    };

    const opcoes = {
        method: 'POST',
        headers: cabecalhos,
        body: JSON.stringify(pedido),
    };

    const resposta = await fetch(ENDERECO_DA_GROQ, opcoes);

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        const erro = new Error('Falha ao chamar a Groq (' + resposta.status + '): ' + detalhe);
        erro.status = resposta.status;
        throw erro;
    }

    const dados = await resposta.json();
    const texto = dados.choices[0].message.content;
    const resultado = JSON.parse(texto);

    return resultado;
}
