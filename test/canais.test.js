import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { carregarCanais, escolherCanais, normalizar } from '../src/canais.js';

const CANAL_PADRAO = 'canal-padrao';

const MAPA = {
    'Tuná Parque': {
        channelId: 'canal-tuna',
        keywords: ['Tuná'],
    },
    'Rota Combo': {
        channelId: 'canal-rota',
        keywords: ['Rota', 'Rota Combo'],
    },
    'Eco Adventure': {
        channelId: 'canal-eco',
        keywords: ['Eco'],
    },
};

test('normalizar tira maiúsculas e acentos', function () {
    const texto = normalizar('Reunião TUNÁ');

    assert.equal(texto, 'reuniao tuna');
});

test('escolherCanais encontra o cliente ignorando acento e maiúscula', function () {
    const canais = escolherCanais('Semanal TUNA parque', MAPA, CANAL_PADRAO);

    assert.deepEqual(canais, ['canal-tuna']);
});

test('escolherCanais envia reunião conjunta para todos os clientes citados', function () {
    const canais = escolherCanais('Alinhamento Eco + Rota', MAPA, CANAL_PADRAO);

    assert.deepEqual(canais, ['canal-rota', 'canal-eco']);
});

test('escolherCanais não repete o canal quando várias palavras-chave combinam', function () {
    const canais = escolherCanais('Rota Combo semanal', MAPA, CANAL_PADRAO);

    assert.deepEqual(canais, ['canal-rota']);
});

test('escolherCanais usa o canal padrão quando nenhum cliente combina', function () {
    const canais = escolherCanais('Reunião interna', MAPA, CANAL_PADRAO);

    assert.deepEqual(canais, [CANAL_PADRAO]);
});

test('carregarCanais devolve mapa vazio quando o arquivo não existe', function () {
    const mapa = carregarCanais('/caminho/que/nao/existe.json');

    assert.deepEqual(mapa, {});
});

test('carregarCanais ignora o campo _comment', function () {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'canais-'));
    const arquivo = path.join(pasta, 'canais.json');
    const conteudo = {
        _comment: 'explicação',
        Cliente: { channelId: '1', keywords: ['Cliente'] },
    };
    fs.writeFileSync(arquivo, JSON.stringify(conteudo));

    const mapa = carregarCanais(arquivo);

    assert.deepEqual(Object.keys(mapa), ['Cliente']);
});

test('carregarCanais avisa quando o JSON é inválido', function () {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'canais-'));
    const arquivo = path.join(pasta, 'canais.json');
    fs.writeFileSync(arquivo, '{ isto não é json');

    assert.throws(function () {
        carregarCanais(arquivo);
    }, /não é um JSON válido/);
});
