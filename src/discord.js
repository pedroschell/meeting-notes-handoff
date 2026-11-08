import { dividirMensagem } from './mensagem.js';

const ENDERECO_DOS_CANAIS = 'https://discord.com/api/v10/channels/';
const MAXIMO_DE_TENTATIVAS = 5;

/** Pausa a execução pelo número de milissegundos informado. */
export function esperar(milissegundos) {
    return new Promise(function (continuar) {
        setTimeout(continuar, milissegundos);
    });
}

/** Envia um texto de até 2.000 caracteres ao canal. Se o Discord pedir para esperar (429), espera e tenta de novo. */
export async function enviarTexto(token, idDoCanal, texto) {
    const link = ENDERECO_DOS_CANAIS + idDoCanal + '/messages';

    const corpo = {
        content: texto,
    };

    const opcoes = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bot ' + token,
        },
        body: JSON.stringify(corpo),
    };

    for (let tentativa = 1; tentativa <= MAXIMO_DE_TENTATIVAS; tentativa++) {
        const resposta = await fetch(link, opcoes);

        if (resposta.ok) {
            return;
        }

        if (resposta.status === 429) {
            const dados = await resposta.json();
            const segundosDeEspera = dados.retry_after;
            await esperar(segundosDeEspera * 1000);
            continue;
        }

        const detalhe = await resposta.text();
        throw new Error('Falha ao enviar ao Discord (' + resposta.status + '): ' + detalhe);
    }

    throw new Error('O Discord continuou pedindo para esperar depois de ' + MAXIMO_DE_TENTATIVAS + ' tentativas.');
}

/** Envia a mensagem ao canal, dividida em partes quando passa do limite do Discord. */
export async function enviarMensagem(token, idDoCanal, mensagem) {
    const partes = dividirMensagem(mensagem);

    for (let i = 0; i < partes.length; i++) {
        await enviarTexto(token, idDoCanal, partes[i]);
    }
}
