import fs from 'node:fs';

/** Lê o mapa de clientes para canais do Discord. Sem arquivo, devolve um mapa vazio. */
export function carregarCanais(arquivoDeCanais) {
    const arquivoExiste = fs.existsSync(arquivoDeCanais);
    if (!arquivoExiste) {
        return {};
    }

    const texto = fs.readFileSync(arquivoDeCanais, 'utf8');

    let mapa;
    try {
        mapa = JSON.parse(texto);
    } catch (erro) {
        throw new Error('O arquivo ' + arquivoDeCanais + ' não é um JSON válido: ' + erro.message);
    }

    delete mapa._comment;

    return mapa;
}

/** Deixa o texto em minúsculas e sem acentos, para "Tuná" e "tuna" serem considerados iguais. */
export function normalizar(texto) {
    if (!texto) {
        return '';
    }

    const minusculo = texto.toLowerCase();
    const separado = minusculo.normalize('NFD');

    return separado.replace(/[̀-ͯ]/g, '');
}

/** Diz se alguma das palavras-chave aparece no título já normalizado. */
function tituloTemPalavraChave(tituloNormalizado, palavrasChave) {
    for (let i = 0; i < palavrasChave.length; i++) {
        const palavraNormalizada = normalizar(palavrasChave[i]);
        if (tituloNormalizado.includes(palavraNormalizada)) {
            return true;
        }
    }

    return false;
}

/** Escolhe os canais da reunião pelas palavras-chave do título. Sem nenhuma correspondência, usa o canal padrão. */
export function escolherCanais(titulo, mapaDeCanais, canalPadrao) {
    const tituloNormalizado = normalizar(titulo);
    const canais = [];

    const clientes = Object.keys(mapaDeCanais);
    for (let i = 0; i < clientes.length; i++) {
        const cliente = mapaDeCanais[clientes[i]];

        let palavrasChave = cliente.keywords;
        if (!palavrasChave) {
            palavrasChave = [];
        }

        const combina = tituloTemPalavraChave(tituloNormalizado, palavrasChave);
        const jaEstaNaLista = canais.includes(cliente.channelId);

        if (combina && !jaEstaNaLista) {
            canais.push(cliente.channelId);
        }
    }

    if (canais.length === 0) {
        canais.push(canalPadrao);
    }

    return canais;
}
