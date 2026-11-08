import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ENDERECO_DE_LOGIN = 'https://accounts.google.com/o/oauth2/v2/auth';
const ENDERECO_DO_TOKEN = 'https://oauth2.googleapis.com/token';
const PERMISSOES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/documents.readonly',
];

/** Lê o client_id e o client_secret do credentials.json baixado do Google Cloud. */
export function lerCredenciais(arquivoDeCredenciais) {
    const arquivoExiste = fs.existsSync(arquivoDeCredenciais);
    if (!arquivoExiste) {
        throw new Error('credentials.json não encontrado. Baixe o cliente OAuth (tipo "App para computador") no Google Cloud.');
    }

    const texto = fs.readFileSync(arquivoDeCredenciais, 'utf8');
    const dados = JSON.parse(texto);

    let cliente = dados.installed;
    if (!cliente) {
        cliente = dados.web;
    }

    if (!cliente || !cliente.client_id || !cliente.client_secret) {
        throw new Error('credentials.json sem client_id ou client_secret.');
    }

    const credenciais = {
        clientId: cliente.client_id,
        clientSecret: cliente.client_secret,
    };

    return credenciais;
}

/** Monta o link de login do Google, pedindo só permissão de leitura da agenda e dos documentos. */
export function montarLinkDeLogin(clientId, enderecoDeRetorno, codigoDeSeguranca) {
    const filtros = new URLSearchParams();
    filtros.set('client_id', clientId);
    filtros.set('redirect_uri', enderecoDeRetorno);
    filtros.set('response_type', 'code');
    filtros.set('scope', PERMISSOES.join(' '));
    filtros.set('access_type', 'offline');
    filtros.set('prompt', 'consent');
    filtros.set('state', codigoDeSeguranca);

    return ENDERECO_DE_LOGIN + '?' + filtros.toString();
}

/** Troca o código recebido no retorno do login por um refresh token, que não expira. */
async function trocarCodigoPorToken(credenciais, codigo, enderecoDeRetorno) {
    const corpo = new URLSearchParams();
    corpo.set('client_id', credenciais.clientId);
    corpo.set('client_secret', credenciais.clientSecret);
    corpo.set('code', codigo);
    corpo.set('redirect_uri', enderecoDeRetorno);
    corpo.set('grant_type', 'authorization_code');

    const opcoes = {
        method: 'POST',
        body: corpo,
    };

    const resposta = await fetch(ENDERECO_DO_TOKEN, opcoes);

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new Error('Falha ao concluir o login no Google (' + resposta.status + '): ' + detalhe);
    }

    const dados = await resposta.json();

    if (!dados.refresh_token) {
        throw new Error('O Google não devolveu um refresh token. Rode a autorização de novo.');
    }

    return dados.refresh_token;
}

/** Abre um servidor local, espera o retorno do login do Google e salva o token.json. */
async function principal() {
    const arquivoDeCredenciais = path.resolve('credentials.json');

    let arquivoToken = path.resolve('token.json');
    if (process.argv[2]) {
        arquivoToken = path.resolve(process.argv[2]);
    }

    const credenciais = lerCredenciais(arquivoDeCredenciais);
    const codigoDeSeguranca = crypto.randomUUID();

    const servidor = http.createServer();
    servidor.listen(0);
    await new Promise(function (continuar) {
        servidor.on('listening', continuar);
    });

    const porta = servidor.address().port;
    const enderecoDeRetorno = 'http://localhost:' + porta;

    console.log('Abra este link no navegador e entre com a conta do Google que tem as reuniões:');
    console.log('');
    console.log(montarLinkDeLogin(credenciais.clientId, enderecoDeRetorno, codigoDeSeguranca));
    console.log('');
    console.log('Esperando o login...');

    servidor.on('request', async function (requisicao, resposta) {
        const endereco = new URL(requisicao.url, enderecoDeRetorno);
        const codigo = endereco.searchParams.get('code');
        const estado = endereco.searchParams.get('state');

        if (!codigo || estado !== codigoDeSeguranca) {
            resposta.writeHead(400);
            resposta.end('Retorno de login inválido.');
            return;
        }

        try {
            const refreshToken = await trocarCodigoPorToken(credenciais, codigo, enderecoDeRetorno);

            const token = {
                type: 'authorized_user',
                client_id: credenciais.clientId,
                client_secret: credenciais.clientSecret,
                refresh_token: refreshToken,
            };
            fs.writeFileSync(arquivoToken, JSON.stringify(token));

            resposta.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            resposta.end('Login concluído. Pode fechar esta aba.');
            console.log('Token salvo em ' + arquivoToken);
        } catch (erro) {
            resposta.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            resposta.end('Não foi possível concluir o login. Veja o terminal.');
            console.error(erro.message);
            process.exitCode = 1;
        }

        servidor.close();
    });
}

const executadoDiretamente = process.argv[1] === import.meta.filename;
if (executadoDiretamente) {
    principal().catch(function (erro) {
        console.error(erro.message);
        process.exit(1);
    });
}
