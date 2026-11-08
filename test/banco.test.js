import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { abrirBanco, ataJaEnviada, chaveDaAta, registrarEnvio } from '../src/banco.js';

const MOMENTO = new Date('2026-11-08T10:00:00-03:00');

/** Monta uma reunião falsa com o id de documento informado. */
function reuniaoFalsa(idDoDocumento) {
    return {
        titulo: 'Reunião semanal',
        data: '06/11/2026',
        linkDaAta: 'https://docs.google.com/document/d/' + idDoDocumento + '/edit',
        idDoDocumento: idDoDocumento,
    };
}

/** Abre um banco novo numa pasta temporária. */
function bancoTemporario() {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'banco-'));
    const arquivo = path.join(pasta, 'dados', 'atas.db');

    return abrirBanco(arquivo);
}

test('ataJaEnviada é falso para uma ata nova', function () {
    const banco = bancoTemporario();

    const enviada = ataJaEnviada(banco, reuniaoFalsa('abc'));

    assert.equal(enviada, false);
});

test('ataJaEnviada é verdadeiro depois de registrar o envio', function () {
    const banco = bancoTemporario();
    const reuniao = reuniaoFalsa('abc');

    registrarEnvio(banco, reuniao, MOMENTO);

    assert.equal(ataJaEnviada(banco, reuniao), true);
    assert.equal(ataJaEnviada(banco, reuniaoFalsa('outra')), false);
});

test('registrarEnvio guarda título, data e momento do envio', function () {
    const banco = bancoTemporario();

    registrarEnvio(banco, reuniaoFalsa('abc'), MOMENTO);

    const linha = banco.prepare('SELECT * FROM atas_enviadas').get();
    assert.equal(linha.chave, 'abc');
    assert.equal(linha.titulo, 'Reunião semanal');
    assert.equal(linha.data_reuniao, '06/11/2026');
    assert.equal(linha.enviada_em, '2026-11-08T13:00:00.000Z');
});

test('registrarEnvio não duplica a mesma ata', function () {
    const banco = bancoTemporario();
    const reuniao = reuniaoFalsa('abc');

    registrarEnvio(banco, reuniao, MOMENTO);
    registrarEnvio(banco, reuniao, MOMENTO);

    const linha = banco.prepare('SELECT COUNT(*) AS total FROM atas_enviadas').get();
    assert.equal(linha.total, 1);
});

test('chaveDaAta usa o link quando não há id do documento', function () {
    const reuniao = reuniaoFalsa('abc');
    reuniao.idDoDocumento = null;

    const chave = chaveDaAta(reuniao);

    assert.equal(chave, 'https://docs.google.com/document/d/abc/edit');
});

test('o banco continua com os registros depois de reaberto', function () {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'banco-'));
    const arquivo = path.join(pasta, 'atas.db');
    const reuniao = reuniaoFalsa('abc');

    const primeiro = abrirBanco(arquivo);
    registrarEnvio(primeiro, reuniao, MOMENTO);
    primeiro.close();

    const segundo = abrirBanco(arquivo);

    assert.equal(ataJaEnviada(segundo, reuniao), true);
});
