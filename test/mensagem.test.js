import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dividirMensagem, montarAvisoDeFalha, montarMensagem } from '../src/mensagem.js';

const REUNIAO = {
    titulo: 'Cliente X | Semanal',
    data: '06/11/2026',
    linkDaAta: 'https://docs.google.com/document/d/abc/edit',
};

test('montarMensagem segue o formato da mensagem do Discord', function () {
    const resultado = {
        resumo: 'Resumo da reunião.',
        demandasCliente: ['Enviar os criativos'],
        demandasEmpresa: ['Subir a campanha', 'Ajustar o orçamento'],
    };

    const mensagem = montarMensagem(REUNIAO, resultado, 'Acme');

    const esperado =
        '📅 **Reunião com Cliente X | Semanal - 06/11/2026**\n' +
        '\n' +
        'Resumo:\n' +
        'Resumo da reunião.\n' +
        '\n' +
        'Demandas Cliente:\n' +
        '• Enviar os criativos\n' +
        '\n' +
        'Demandas Acme:\n' +
        '• Subir a campanha\n' +
        '• Ajustar o orçamento\n' +
        '\n' +
        '🔗 Ata completa: https://docs.google.com/document/d/abc/edit';

    assert.equal(mensagem, esperado);
});

test('montarMensagem avisa quando não há resumo nem demandas', function () {
    const resultado = {
        resumo: '',
        demandasCliente: [],
    };

    const mensagem = montarMensagem(REUNIAO, resultado, 'Acme');

    assert.ok(mensagem.includes('Resumo:\nNenhum identificado'));
    assert.ok(mensagem.includes('Demandas Cliente:\n• Nenhuma identificada'));
    assert.ok(mensagem.includes('Demandas Acme:\n• Nenhuma identificada'));
});

test('montarAvisoDeFalha inclui o motivo quando ele é informado', function () {
    const aviso = montarAvisoDeFalha(REUNIAO, 'Não foi possível gerar o resumo.');

    assert.equal(
        aviso,
        '📄 **Ata disponível: Cliente X | Semanal**\n06/11/2026\nhttps://docs.google.com/document/d/abc/edit\n\n⚠️ Não foi possível gerar o resumo.',
    );
});

test('montarAvisoDeFalha sem motivo traz só o título, a data e o link', function () {
    const aviso = montarAvisoDeFalha(REUNIAO, '');

    assert.equal(aviso, '📄 **Ata disponível: Cliente X | Semanal**\n06/11/2026\nhttps://docs.google.com/document/d/abc/edit');
});

test('dividirMensagem mantém mensagens curtas inteiras', function () {
    const partes = dividirMensagem('Mensagem curta.');

    assert.deepEqual(partes, ['Mensagem curta.']);
});

test('dividirMensagem corta na última quebra de linha antes do limite', function () {
    const linha = 'a'.repeat(999);
    const texto = linha + '\n' + linha + '\n' + linha;

    const partes = dividirMensagem(texto);

    assert.equal(partes.length, 2);
    assert.equal(partes[0], linha + '\n' + linha);
    assert.equal(partes[1], linha);
});

test('dividirMensagem corta no limite quando não há quebra de linha', function () {
    const texto = 'b'.repeat(4500);

    const partes = dividirMensagem(texto);

    assert.equal(partes.length, 3);
    assert.equal(partes[0].length, 2000);
    assert.equal(partes[2].length, 500);
});
