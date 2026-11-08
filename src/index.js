import path from 'node:path';

import { buscarDocumento, extrairSecoes } from './documento.js';
import { buscarEventos, obterTokenDeAcesso, selecionarReunioesComAta } from './google.js';

const diasAnalisar = 7;
const arquivoToken = path.resolve('token.json');

/** Mostra o tamanho de cada seção da ata da reunião, ou o motivo caso não conseguir ler. */
async function mostrarSecoesDaAta(tokenDeAcesso, reuniao) {
    if (!reuniao.idDoDocumento) {
        console.log('            Link da ata sem id de documento.');
        return;
    }

    try {
        const documento = await buscarDocumento(tokenDeAcesso, reuniao.idDoDocumento);
        const secoes = extrairSecoes(documento);

        if (secoes.length === 0) {
            console.log('            Ata sem texto.');
            return;
        }

        for (let i = 0; i < secoes.length; i++) {
            const secao = secoes[i];
            console.log('            ' + secao.titulo + ': ' + secao.texto.length + ' caracteres');
        }
    } catch (erro) {
        console.log('            ' + erro.message);
    }
}

/** Lista as reuniões já encerradas que têm Anotações do Gemini e as seções de cada ata. */
async function principal() {
    const agora = new Date();

    const tokenDeAcesso = await obterTokenDeAcesso(arquivoToken);
    const eventos = await buscarEventos(tokenDeAcesso, diasAnalisar, agora);
    const reunioes = selecionarReunioesComAta(eventos, agora);

    if (reunioes.length === 0) {
        console.log('Nenhuma reunião com Anotações do Gemini nos últimos ' + diasAnalisar + ' dias.');
        return;
    }

    console.log(reunioes.length + ' reunião(ões) com Anotações do Gemini:');
    console.log('');

    for (let i = 0; i < reunioes.length; i++) {
        const reuniao = reunioes[i];
        console.log(reuniao.data + '  ' + reuniao.titulo);
        console.log('            ' + reuniao.linkDaAta);
        await mostrarSecoesDaAta(tokenDeAcesso, reuniao);
        console.log('');
    }
}

principal().catch(function (erro) {
    console.error(erro.message);
    process.exit(1);
});
