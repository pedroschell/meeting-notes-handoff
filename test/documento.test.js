import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extrairSecoes, extrairTexto } from '../src/documento.js';

/** Monta um parágrafo falso do Google Docs com os trechos de texto informados. */
function paragrafoFalso(trechos) {
    const partes = [];

    for (let i = 0; i < trechos.length; i++) {
        const parte = {
            textRun: {
                content: trechos[i],
            },
        };
        partes.push(parte);
    }

    return {
        paragraph: {
            elements: partes,
        },
    };
}

/** Monta uma aba falsa do Google Docs com um título e um parágrafo de texto. */
function abaFalsa(titulo, texto) {
    return {
        tabProperties: {
            title: titulo,
        },
        documentTab: {
            body: {
                content: [paragrafoFalso([texto])],
            },
        },
    };
}

test('extrairTexto junta os trechos de todos os parágrafos', function () {
    const conteudo = [
        paragrafoFalso(['Olá, ', 'pessoal.\n']),
        paragrafoFalso(['Próximos passos.\n']),
    ];

    const texto = extrairTexto(conteudo);

    assert.equal(texto, 'Olá, pessoal.\nPróximos passos.\n');
});

test('extrairTexto ignora elementos que não são parágrafo', function () {
    const conteudo = [
        { sectionBreak: {} },
        paragrafoFalso(['Texto.\n']),
        { table: {} },
    ];

    const texto = extrairTexto(conteudo);

    assert.equal(texto, 'Texto.\n');
});

test('extrairTexto devolve texto vazio quando não há conteúdo', function () {
    const texto = extrairTexto(undefined);

    assert.equal(texto, '');
});

test('extrairSecoes cria uma seção por aba', function () {
    const documento = {
        tabs: [
            abaFalsa('Anotações', 'Resumo da reunião.\n'),
            abaFalsa('Transcrição', 'Cliente: precisamos de três criativos.\n'),
        ],
    };

    const secoes = extrairSecoes(documento);

    assert.equal(secoes.length, 2);
    assert.equal(secoes[0].titulo, 'Anotações');
    assert.equal(secoes[0].texto, 'Resumo da reunião.');
    assert.equal(secoes[1].titulo, 'Transcrição');
});

test('extrairSecoes inclui as abas filhas', function () {
    const abaPrincipal = abaFalsa('Anotações', 'Resumo.\n');
    abaPrincipal.childTabs = [abaFalsa('Detalhes', 'Detalhe.\n')];

    const documento = {
        tabs: [abaPrincipal],
    };

    const secoes = extrairSecoes(documento);

    assert.equal(secoes.length, 2);
    assert.equal(secoes[1].titulo, 'Detalhes');
});

test('extrairSecoes ignora abas sem texto', function () {
    const documento = {
        tabs: [
            abaFalsa('Anotações', 'Resumo.\n'),
            abaFalsa('Vazia', '   \n'),
        ],
    };

    const secoes = extrairSecoes(documento);

    assert.equal(secoes.length, 1);
    assert.equal(secoes[0].titulo, 'Anotações');
});

test('extrairSecoes usa o corpo inteiro quando o documento não tem abas', function () {
    const documento = {
        body: {
            content: [paragrafoFalso(['Ata sem abas.\n'])],
        },
    };

    const secoes = extrairSecoes(documento);

    assert.equal(secoes.length, 1);
    assert.equal(secoes[0].titulo, 'Conteúdo');
    assert.equal(secoes[0].texto, 'Ata sem abas.');
});
