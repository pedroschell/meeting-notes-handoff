import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { lerCredenciais, montarLinkDeLogin } from '../src/autorizar.js';

/** Grava um credentials.json falso numa pasta temporária e devolve o caminho. */
function credenciaisFalsas(conteudo) {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'credenciais-'));
    const arquivo = path.join(pasta, 'credentials.json');
    fs.writeFileSync(arquivo, JSON.stringify(conteudo));

    return arquivo;
}

test('lerCredenciais lê um cliente do tipo app para computador', function () {
    const arquivo = credenciaisFalsas({
        installed: { client_id: 'id-falso', client_secret: 'segredo-falso' },
    });

    const credenciais = lerCredenciais(arquivo);

    assert.equal(credenciais.clientId, 'id-falso');
    assert.equal(credenciais.clientSecret, 'segredo-falso');
});

test('lerCredenciais avisa quando o arquivo não existe', function () {
    assert.throws(function () {
        lerCredenciais('/caminho/que/nao/existe.json');
    }, /credentials.json não encontrado/);
});

test('lerCredenciais avisa quando falta o client_secret', function () {
    const arquivo = credenciaisFalsas({
        installed: { client_id: 'id-falso' },
    });

    assert.throws(function () {
        lerCredenciais(arquivo);
    }, /sem client_id ou client_secret/);
});

test('montarLinkDeLogin pede só leitura da agenda e dos documentos', function () {
    const link = montarLinkDeLogin('id-falso', 'http://localhost:5000', 'codigo-123');
    const endereco = new URL(link);

    assert.equal(endereco.origin + endereco.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(endereco.searchParams.get('client_id'), 'id-falso');
    assert.equal(endereco.searchParams.get('redirect_uri'), 'http://localhost:5000');
    assert.equal(endereco.searchParams.get('access_type'), 'offline');
    assert.equal(endereco.searchParams.get('state'), 'codigo-123');
    assert.equal(
        endereco.searchParams.get('scope'),
        'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/documents.readonly',
    );
});
