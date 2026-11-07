import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extrairIdDoDocumento, formatarData, selecionarReunioesComAta } from '../src/google.js';

const AGORA = new Date('2026-11-06T12:00:00-03:00');
const LINK_DA_ATA = 'https://docs.google.com/document/d/abc123_DEF/edit';

/** Monta um anexo de Anotações do Gemini falso. */
function ataFalsa() {
    return {
        title: 'Reunião semanal – Anotações do Gemini',
        mimeType: 'application/vnd.google-apps.document',
        fileUrl: LINK_DA_ATA,
        fileId: 'abc123_DEF',
    };
}

/** Monta um evento de agenda falso, já encerrado e com ata. */
function eventoFalso() {
    return {
        summary: 'Reunião semanal',
        start: { dateTime: '2026-11-05T10:00:00-03:00' },
        end: { dateTime: '2026-11-05T11:00:00-03:00' },
        attachments: [ataFalsa()],
    };
}

test('formatarData devolve DD/MM/AAAA', function () {
    const data = formatarData('2026-11-05T10:00:00-03:00');

    assert.equal(data, '05/11/2026');
});

test('extrairIdDoDocumento lê o id de um link do Docs', function () {
    const id = extrairIdDoDocumento(LINK_DA_ATA);

    assert.equal(id, 'abc123_DEF');
});

test('extrairIdDoDocumento devolve null para outros links', function () {
    assert.equal(extrairIdDoDocumento('https://example.com/arquivo'), null);
    assert.equal(extrairIdDoDocumento(undefined), null);
});

test('mantém reunião encerrada com ata', function () {
    const reunioes = selecionarReunioesComAta([eventoFalso()], AGORA);

    assert.equal(reunioes.length, 1);
    assert.equal(reunioes[0].titulo, 'Reunião semanal');
    assert.equal(reunioes[0].data, '05/11/2026');
    assert.equal(reunioes[0].linkDaAta, LINK_DA_ATA);
    assert.equal(reunioes[0].idDoDocumento, 'abc123_DEF');
});

test('ignora reunião que ainda não terminou', function () {
    const evento = eventoFalso();
    evento.end = { dateTime: '2026-11-06T13:00:00-03:00' };

    const reunioes = selecionarReunioesComAta([evento], AGORA);

    assert.equal(reunioes.length, 0);
});

test('ignora reunião sem anexo', function () {
    const evento = eventoFalso();
    evento.attachments = undefined;

    const reunioes = selecionarReunioesComAta([evento], AGORA);

    assert.equal(reunioes.length, 0);
});

test('ignora anexo que não é Google Docs', function () {
    const evento = eventoFalso();
    evento.attachments[0].mimeType = 'application/pdf';

    const reunioes = selecionarReunioesComAta([evento], AGORA);

    assert.equal(reunioes.length, 0);
});

test('ignora documento que não é ata do Gemini', function () {
    const evento = eventoFalso();
    evento.attachments[0].title = 'Pauta da reunião';

    const reunioes = selecionarReunioesComAta([evento], AGORA);

    assert.equal(reunioes.length, 0);
});

test('usa o link quando o anexo não traz o id do documento', function () {
    const evento = eventoFalso();
    evento.attachments[0].fileId = undefined;

    const reunioes = selecionarReunioesComAta([evento], AGORA);

    assert.equal(reunioes[0].idDoDocumento, 'abc123_DEF');
});

test('aceita evento de dia inteiro e evento sem título', function () {
    const evento = eventoFalso();
    evento.summary = undefined;
    evento.start = { date: '2026-11-04' };
    evento.end = { date: '2026-11-05' };

    const reunioes = selecionarReunioesComAta([evento], AGORA);

    assert.equal(reunioes.length, 1);
    assert.equal(reunioes[0].titulo, '(sem título)');
});
