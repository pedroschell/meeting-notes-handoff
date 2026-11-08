const ENDERECO_DOS_DOCUMENTOS = 'https://docs.googleapis.com/v1/documents/';

/** Busca o documento da ata no Google Docs, com o conteúdo de todas as abas. */
export async function buscarDocumento(tokenDeAcesso, idDoDocumento) {
    const link = ENDERECO_DOS_DOCUMENTOS + idDoDocumento + '?includeTabsContent=true';

    const opcoes = {
        headers: {
            Authorization: 'Bearer ' + tokenDeAcesso,
        },
    };

    const resposta = await fetch(link, opcoes);

    const semAcesso = resposta.status === 403 || resposta.status === 404;
    if (semAcesso) {
        const erroDeAcesso = new Error('A sua conta não tem acesso a este documento (' + resposta.status + ').');
        erroDeAcesso.status = resposta.status;
        throw erroDeAcesso;
    }

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        const erro = new Error('Falha ao ler o documento (' + resposta.status + '): ' + detalhe);
        erro.status = resposta.status;
        throw erro;
    }

    const documento = await resposta.json();

    return documento;
}

/** Junta o texto de todos os parágrafos do conteúdo de um documento. */
export function extrairTexto(conteudo) {
    if (!conteudo) {
        return '';
    }

    let texto = '';

    for (let i = 0; i < conteudo.length; i++) {
        const elemento = conteudo[i];
        if (!elemento.paragraph) {
            continue;
        }

        const partes = elemento.paragraph.elements;
        if (!partes) {
            continue;
        }

        for (let j = 0; j < partes.length; j++) {
            const parte = partes[j];
            if (parte.textRun && parte.textRun.content) {
                texto = texto + parte.textRun.content;
            }
        }
    }

    return texto;
}

/** Adiciona à lista uma seção para cada aba que tem texto, incluindo as abas filhas. */
function coletarSecoesDasAbas(abas, secoes) {
    if (!abas) {
        return;
    }

    for (let i = 0; i < abas.length; i++) {
        const aba = abas[i];

        let titulo = 'Sem título';
        if (aba.tabProperties && aba.tabProperties.title) {
            titulo = aba.tabProperties.title;
        }

        let texto = '';
        if (aba.documentTab && aba.documentTab.body) {
            texto = extrairTexto(aba.documentTab.body.content).trim();
        }

        if (texto !== '') {
            const secao = {
                titulo: titulo,
                texto: texto,
            };
            secoes.push(secao);
        }

        coletarSecoesDasAbas(aba.childTabs, secoes);
    }
}

/** Separa o documento em seções, uma por aba. Sem abas, devolve o documento inteiro numa seção só. */
export function extrairSecoes(documento) {
    const secoes = [];

    const temAbas = documento.tabs && documento.tabs.length > 0;
    if (temAbas) {
        coletarSecoesDasAbas(documento.tabs, secoes);
        return secoes;
    }

    let texto = '';
    if (documento.body) {
        texto = extrairTexto(documento.body.content).trim();
    }

    if (texto !== '') {
        const secao = {
            titulo: 'Conteúdo',
            texto: texto,
        };
        secoes.push(secao);
    }

    return secoes;
}
