const ENDERECO_DA_GROQ = 'https://api.groq.com/openai/v1/chat/completions';

export async function perguntarAoGroq(pergunta) {
    const cabecalhos = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.GROQ_API_KEY,
    };

    const pedido = {
        model: process.env.GROQ_MODEL,
        messages: [
            { role: 'user', content: pergunta },
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
        throw new Error('Falha ao chamar a Groq (' + resposta.status + '): ' + detalhe);
    }

    const dados = await resposta.json();
    const texto = dados.choices[0].message.content;

    return texto;
}
