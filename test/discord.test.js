import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { enviarMensagem, enviarTexto } from '../src/discord.js';

const fetchOriginal = globalThis.fetch;

afterEach(function () {
    globalThis.fetch = fetchOriginal;
});

/** Troca o fetch por um falso que devolve as respostas da lista, em ordem, e guarda cada pedido recebido. */
function usarFetchFalso(respostas) {
    const pedidos = [];

    globalThis.fetch = async function (link, opcoes) {
        const pedido = {
            link: link,
            opcoes: opcoes,
        };
        pedidos.push(pedido);

        const resposta = respostas[pedidos.length - 1];

        return new Response(resposta.corpo, { status: resposta.status });
    };

    return pedidos;
}

test('enviarTexto faz um POST no canal com o token do bot', async function () {
    const pedidos = usarFetchFalso([{ status: 200, corpo: '{}' }]);

    await enviarTexto('token-falso', '123', 'Olá');

    assert.equal(pedidos.length, 1);
    assert.equal(pedidos[0].link, 'https://discord.com/api/v10/channels/123/messages');
    assert.equal(pedidos[0].opcoes.method, 'POST');
    assert.equal(pedidos[0].opcoes.headers.Authorization, 'Bot token-falso');
    assert.equal(pedidos[0].opcoes.body, '{"content":"Olá"}');
});

test('enviarTexto espera e tenta de novo quando o Discord responde 429', async function () {
    const pedidos = usarFetchFalso([
        { status: 429, corpo: '{"retry_after": 0.01}' },
        { status: 200, corpo: '{}' },
    ]);

    await enviarTexto('token-falso', '123', 'Olá');

    assert.equal(pedidos.length, 2);
});

test('enviarTexto avisa quando o Discord recusa o envio', async function () {
    usarFetchFalso([{ status: 403, corpo: 'Missing Access' }]);

    await assert.rejects(enviarTexto('token-falso', '123', 'Olá'), /Falha ao enviar ao Discord \(403\): Missing Access/);
});

test('enviarMensagem envia cada parte de uma mensagem longa', async function () {
    const pedidos = usarFetchFalso([
        { status: 200, corpo: '{}' },
        { status: 200, corpo: '{}' },
        { status: 200, corpo: '{}' },
    ]);
    const mensagem = 'a'.repeat(4500);

    await enviarMensagem('token-falso', '123', mensagem);

    assert.equal(pedidos.length, 3);
});
