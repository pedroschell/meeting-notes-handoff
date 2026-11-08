import path from 'node:path';

import { abrirBanco, ataJaEnviada, registrarEnvio } from './banco.js';
import { carregarCanais, escolherCanais } from './canais.js';
import { enviarMensagem, esperar } from './discord.js';
import { buscarDocumento, extrairSecoes } from './documento.js';
import { buscarEventos, obterTokenDeAcesso, selecionarReunioesComAta } from './google.js';
import { perguntarAoGroq } from './groq.js';
import { montarAvisoDeFalha, montarMensagem } from './mensagem.js';
import { montarConteudo, montarInstrucoes } from './prompt.js';

const diasAnalisar = 7;
const esperaEntreResumos = 60000;
const arquivoToken = path.resolve('token.json');
const arquivoDeCanais = path.resolve('canais.json');
const arquivoDoBanco = path.resolve('data', 'meeting-notes.db');

const AVISO_SEM_ACESSO = 'Não foi possível gerar o resumo: a conta do bot não tem acesso ao documento.';
const AVISO_LIMITE_DA_GROQ = 'Não foi possível gerar o resumo: limite de uso do Groq atingido. Tente disparar o bot novamente em alguns minutos.';
const MENSAGEM_SEM_ATAS = '🔍 Nenhuma ata disponível por enquanto.';

/** Lê uma variável obrigatória do .env e avisa qual está faltando. */
function lerVariavel(nome) {
    const valor = process.env[nome];
    if (!valor) {
        throw new Error('A variável ' + nome + ' não está preenchida no .env.');
    }

    return valor;
}

/** Escolhe o aviso que vai no lugar do resumo, conforme o erro que impediu de gerá-lo. */
function avisoParaOErro(erro) {
    const semAcesso = erro.status === 403 || erro.status === 404;
    if (semAcesso) {
        return AVISO_SEM_ACESSO;
    }

    const limiteDaGroq = erro.message.startsWith('Falha ao chamar a Groq') && (erro.status === 413 || erro.status === 429);
    if (limiteDaGroq) {
        return AVISO_LIMITE_DA_GROQ;
    }

    return '';
}

/** Busca as atas da semana, resume as que ainda não foram enviadas e envia cada uma ao canal do cliente. */
async function principal() {
    const tokenDoDiscord = lerVariavel('DISCORD_TOKEN');
    const canalPadrao = lerVariavel('DISCORD_CHANNEL_ID');
    const nomeDaEmpresa = lerVariavel('NOME_DA_EMPRESA');
    lerVariavel('GROQ_API_KEY');
    lerVariavel('GROQ_MODEL');

    const agora = new Date();
    const banco = abrirBanco(arquivoDoBanco);
    const mapaDeCanais = carregarCanais(arquivoDeCanais);
    const instrucoes = montarInstrucoes(nomeDaEmpresa);

    const tokenDoGoogle = await obterTokenDeAcesso(arquivoToken);
    const eventos = await buscarEventos(tokenDoGoogle, diasAnalisar, agora);
    const reunioes = selecionarReunioesComAta(eventos, agora);

    let atasEnviadas = 0;
    let jaChamouAGroq = false;

    for (let i = 0; i < reunioes.length; i++) {
        const reuniao = reunioes[i];

        if (ataJaEnviada(banco, reuniao)) {
            continue;
        }

        console.log('Ata: ' + reuniao.data + '  ' + reuniao.titulo);

        let mensagem = montarAvisoDeFalha(reuniao, '');

        if (reuniao.idDoDocumento) {
            try {
                const documento = await buscarDocumento(tokenDoGoogle, reuniao.idDoDocumento);
                const secoes = extrairSecoes(documento);

                if (jaChamouAGroq) {
                    console.log('   aguardando 60 s para não estourar o limite da Groq...');
                    await esperar(esperaEntreResumos);
                }
                jaChamouAGroq = true;

                const conteudo = montarConteudo(reuniao.titulo, secoes);
                const resultado = await perguntarAoGroq(instrucoes, conteudo);
                mensagem = montarMensagem(reuniao, resultado, nomeDaEmpresa);
            } catch (erro) {
                console.error('   não foi possível resumir: ' + erro.message);
                const aviso = avisoParaOErro(erro);
                mensagem = montarAvisoDeFalha(reuniao, aviso);
            }
        }

        const canais = escolherCanais(reuniao.titulo, mapaDeCanais, canalPadrao);
        for (let j = 0; j < canais.length; j++) {
            await enviarMensagem(tokenDoDiscord, canais[j], mensagem);
        }

        registrarEnvio(banco, reuniao, new Date());
        atasEnviadas = atasEnviadas + 1;
        console.log('   enviada para ' + canais.length + ' canal(is).');
    }

    if (atasEnviadas > 0) {
        console.log(atasEnviadas + ' ata(s) nova(s) enviada(s).');
        return;
    }

    console.log('Nenhuma ata nova para enviar.');
    await enviarMensagem(tokenDoDiscord, canalPadrao, MENSAGEM_SEM_ATAS);
}

principal().catch(function (erro) {
    console.error(erro.message);
    process.exit(1);
});
