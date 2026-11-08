const LIMITE_DE_CARACTERES = 12000;
const AVISO_DE_CORTE = '[...inicio da transcrição omitido por limite de tamanho...]\n';

/** Monta as instruções enviadas à IA, com o nome da empresa que presta o serviço. */
export function montarInstrucoes(nomeDaEmpresa) {
    const nomeEmMaiusculas = nomeDaEmpresa.toUpperCase();

    const instrucoes =
        'Voce e um assistente que escreve atas de reuniao da empresa ' + nomeDaEmpresa + ' (agencia) com seus clientes, ' +
        'a partir das anotacoes e da transcricao literal geradas pelo Gemini. ' +
        'A parte de demandas e a mais importante deste trabalho: a equipe da ' + nomeDaEmpresa + ' depende dela para saber ' +
        'exatamente o que foi pedido, e nao pode ficar vago.\n\n' +
        'Responda APENAS com um JSON valido (sem markdown, sem comentarios), com este formato:\n' +
        '{"resumo": string, "demandasCliente": string[], "demandasEmpresa": string[]}\n\n' +
        'resumo: 1 a 3 frases corridas (sem bullets) cobrindo o assunto principal da reuniao, ' +
        'as decisoes tomadas e os pontos que ficaram pendentes ou em aberto para definicao futura. ' +
        'Seja direto, sem floreios.\n\n' +
        'demandasCliente: lista de acoes que o CLIENTE (quem contrata a ' + nomeDaEmpresa + ') ficou responsavel por fazer.\n' +
        'demandasEmpresa: lista de acoes que a ' + nomeEmMaiusculas + ' (agencia que presta o servico) ficou responsavel por fazer.\n\n' +
        'Como extrair as demandas (siga isso com rigor):\n' +
        '1. Use a TRANSCRICAO (a fala literal dos participantes) como fonte principal, nao so o resumo automatico ' +
        'do Gemini. O resumo automatico costuma ser vago; a transcricao tem os detalhes reais do que foi pedido.\n' +
        '2. Releia mentalmente cada trecho onde alguem pede, combina ou se compromete a fazer algo ' +
        '(frases como "vou fazer", "pode fazer", "preciso que", "fica combinado", "vamos subir", "manda ate"). ' +
        'Transforme cada compromisso real em um item separado.\n' +
        '3. Cada item tem que responder "o que exatamente" de forma que alguem que NAO estava na reuniao consiga ' +
        'executar a tarefa sem precisar perguntar nada de volta. Inclua sempre que estiver disponivel na fala: ' +
        'nome da campanha/peca/cliente especifico, plataforma (Meta, TikTok, Google, YouTube, Instagram...), ' +
        'valor de orcamento, quantidade (quantos criativos, quantos videos), prazo/data mencionada, e o motivo ' +
        '(ex: "para aumentar conversao", "por causa da queda de visualizacoes").\n' +
        '4. PROIBIDO usar frases genericas e vazias como "calcular datas", "alinhar expectativas", ' +
        '"definir estrategia", "validar pontos pendentes" sem dizer QUAL data, QUAL expectativa, QUAL estrategia, ' +
        'QUAL pendencia. Se a transcricao nao der esse detalhe para um ponto especifico, NAO crie um item vago so ' +
        'para preencher a lista - prefira omitir esse ponto a deixar algo generico.\n' +
        '5. Nao invente informacao que nao esteja nas anotacoes/transcricao.\n' +
        '6. Atribua a demanda a quem realmente ficou responsavel por executa-la (quem disse "eu vou fazer" ou para ' +
        'quem foi pedido), e nao a quem so foi mencionado de passagem na conversa.\n' +
        '7. Cada item comeca com verbo de acao no infinitivo (ex: "Criar", "Subir", "Aprovar", "Enviar", "Revisar", ' +
        '"Repassar"), em portugues do Brasil, em uma frase curta e direta.\n' +
        '8. Se uma lista nao tiver itens concretos, retorne um array vazio - nao invente para nao deixar vazio.\n\n' +
        'Exemplo de NIVEL DE DETALHE esperado (nao copie o conteudo, copie o estilo):\n' +
        'Trecho da transcricao: "Cliente: a gente queria subir mais uns 3 criativos novos pro Instagram essa semana, ' +
        'focado em conversao, e queria que o orcamento desse Game Dev fosse pra 2 mil reais." ' +
        '"' + nomeDaEmpresa + ': fechado, eu calculo o reajuste e ja deixo programado pra sexta."\n' +
        'Item ruim (NAO faca assim): "Ajustar orcamento da campanha."\n' +
        'Item correto: "Aumentar o orçamento da campanha de Game Dev para R$ 2.000, com foco em conversão."\n' +
        'Item correto: "Subir 3 criativos novos no Instagram até sexta-feira, com foco em conversão."';

    return instrucoes;
}

/** Diz se a seção é a de observações (o resumo do Gemini), que sempre entra inteira. */
function ehObservacoes(titulo) {
    const tituloMinusculo = titulo.toLowerCase();

    return tituloMinusculo.includes('observa');
}

/** Junta duas partes de texto com uma linha em branco entre elas, ignorando a parte vazia. */
function juntarBlocos(primeiro, segundo) {
    if (primeiro === '') {
        return segundo;
    }

    if (segundo === '') {
        return primeiro;
    }

    return primeiro + '\n\n' + segundo;
}

/** Junta as seções da ata respeitando o limite: observações inteiras e, da transcrição, o final que couber. */
export function montarTextoDaAta(secoes, limite) {
    let blocoDeObservacoes = '';
    let blocoDoRestante = '';

    for (let i = 0; i < secoes.length; i++) {
        const secao = secoes[i];
        const bloco = '--- ' + secao.titulo + ' ---\n' + secao.texto;

        if (ehObservacoes(secao.titulo)) {
            blocoDeObservacoes = juntarBlocos(blocoDeObservacoes, bloco);
        } else {
            blocoDoRestante = juntarBlocos(blocoDoRestante, bloco);
        }
    }

    const espacoQueSobra = limite - blocoDeObservacoes.length;

    if (espacoQueSobra <= 0) {
        blocoDoRestante = '';
    } else if (blocoDoRestante.length > espacoQueSobra) {
        const inicioDoCorte = blocoDoRestante.length - (espacoQueSobra - 60);
        blocoDoRestante = AVISO_DE_CORTE + blocoDoRestante.slice(inicioDoCorte);
    }

    const texto = juntarBlocos(blocoDeObservacoes, blocoDoRestante);

    return texto.trim();
}

/** Monta o conteúdo enviado à IA: o título da reunião seguido do texto da ata. */
export function montarConteudo(titulo, secoes) {
    const textoDaAta = montarTextoDaAta(secoes, LIMITE_DE_CARACTERES);

    return 'Reuniao: ' + titulo + '\n\nAta (Anotacoes do Gemini):\n' + textoDaAta;
}
