import path from 'node:path';

import { buscarEventos, obterTokenDeAcesso, selecionarReunioesComAta } from './google.js';

const diasAnalisar = 7;
const arquivoToken = path.resolve('token.json');

/** Lista as reuniões já encerradas que têm Anotações do Gemini na agenda principal. */
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
    }
}

principal().catch(function (erro) {
    console.error(erro.message);
    process.exit(1);
});
