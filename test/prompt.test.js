import { test } from 'node:test';
import assert from 'node:assert/strict';

import { montarConteudo, montarInstrucoes, montarTextoDaAta } from '../src/prompt.js';

test('montarInstrucoes usa o nome da empresa informado', function () {
    const instrucoes = montarInstrucoes('Acme');

    assert.ok(instrucoes.includes('atas de reuniao da empresa Acme (agencia)'));
    assert.ok(instrucoes.includes('lista de acoes que a ACME (agencia que presta o servico)'));
    assert.ok(instrucoes.includes('"demandasEmpresa": string[]'));
});

test('montarTextoDaAta junta as seções quando cabem no limite', function () {
    const secoes = [
        { titulo: 'Observações', texto: 'Resumo.' },
        { titulo: 'Transcrição', texto: 'Fala.' },
    ];

    const texto = montarTextoDaAta(secoes, 12000);

    assert.equal(texto, '--- Observações ---\nResumo.\n\n--- Transcrição ---\nFala.');
});

test('montarTextoDaAta mantém as observações inteiras e o final da transcrição', function () {
    const secoes = [
        { titulo: 'Observações', texto: 'o'.repeat(100) },
        { titulo: 'Transcrição', texto: 'inicio' + 't'.repeat(1000) + 'FIM' },
    ];

    const texto = montarTextoDaAta(secoes, 500);

    assert.ok(texto.startsWith('--- Observações ---\n' + 'o'.repeat(100)));
    assert.ok(texto.includes('[...inicio da transcrição omitido por limite de tamanho...]'));
    assert.ok(texto.endsWith('FIM'));
    assert.ok(!texto.includes('inicio' + 't'));
});

test('montarTextoDaAta descarta a transcrição quando as observações ocupam o limite', function () {
    const secoes = [
        { titulo: 'Observações', texto: 'o'.repeat(600) },
        { titulo: 'Transcrição', texto: 'Fala.' },
    ];

    const texto = montarTextoDaAta(secoes, 500);

    assert.ok(!texto.includes('Transcrição'));
});

test('montarConteudo coloca o título da reunião antes da ata', function () {
    const secoes = [
        { titulo: 'Observações', texto: 'Resumo.' },
    ];

    const conteudo = montarConteudo('Reunião semanal', secoes);

    assert.equal(conteudo, 'Reuniao: Reunião semanal\n\nAta (Anotacoes do Gemini):\n--- Observações ---\nResumo.');
});
