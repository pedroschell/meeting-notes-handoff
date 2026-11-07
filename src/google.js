import fs from 'node:fs';

const ENDERECO_DO_TOKEN = 'https://oauth2.googleapis.com/token';
const ENDERECO_DA_AGENDA = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TIPO_GOOGLE_DOCS = 'application/vnd.google-apps.document';
const TITULO_DA_ATA = 'anotações do gemini';
const MAXIMO_DE_EVENTOS = 250;

/** Troca o refresh token salvo no token.json por um token de acesso temporário. */
export async function obterTokenDeAcesso(arquivoToken) {
    const tokenExiste = fs.existsSync(arquivoToken);
    if (!tokenExiste) {
        throw new Error('token.json não encontrado. Autorize a sua conta do Google primeiro.');
    }

    const textoDoToken = fs.readFileSync(arquivoToken, 'utf8');
    const tokenSalvo = JSON.parse(textoDoToken);

    const corpo = new URLSearchParams();
    corpo.set('client_id', tokenSalvo.client_id);
    corpo.set('client_secret', tokenSalvo.client_secret);
    corpo.set('refresh_token', tokenSalvo.refresh_token);
    corpo.set('grant_type', 'refresh_token');

    const opcoes = {
        method: 'POST',
        body: corpo,
    };

    const resposta = await fetch(ENDERECO_DO_TOKEN, opcoes);

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new Error('Falha ao renovar o acesso ao Google (' + resposta.status + '): ' + detalhe);
    }

    const dados = await resposta.json();

    return dados.access_token;
}

/** Busca os eventos da agenda principal da conta entre `diasAnalisar` dias atrás e `agora`. */
export async function buscarEventos(tokenDeAcesso, diasAnalisar, agora) {
    const dataInicial = new Date(agora);
    const diaInicial = dataInicial.getDate() - diasAnalisar;
    dataInicial.setDate(diaInicial);

    const filtros = new URLSearchParams();
    filtros.set('timeMin', dataInicial.toISOString());
    filtros.set('timeMax', agora.toISOString());
    filtros.set('singleEvents', 'true');
    filtros.set('orderBy', 'startTime');
    filtros.set('maxResults', String(MAXIMO_DE_EVENTOS));

    const link = ENDERECO_DA_AGENDA + '?' + filtros.toString();

    const opcoes = {
        headers: {
            Authorization: 'Bearer ' + tokenDeAcesso,
        },
    };

    const resposta = await fetch(link, opcoes);

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new Error('Falha ao ler a agenda (' + resposta.status + '): ' + detalhe);
    }

    const dados = await resposta.json();

    if (!dados.items) {
        return [];
    }

    return dados.items;
}

/** Formata uma data no padrão DD/MM/AAAA. */
export function formatarData(valor) {
    const data = new Date(valor);

    const numeroDoDia = data.getDate();
    const numeroDoMes = data.getMonth() + 1;
    const ano = data.getFullYear();

    const dia = String(numeroDoDia).padStart(2, '0');
    const mes = String(numeroDoMes).padStart(2, '0');

    return dia + '/' + mes + '/' + ano;
}

/** Extrai o id do documento de um link do Google Docs. Devolve null se não for um link de documento. */
export function extrairIdDoDocumento(link) {
    if (!link) {
        return null;
    }

    const achado = link.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (achado === null) {
        return null;
    }

    return achado[1];
}

/** Devolve o anexo de Anotações do Gemini do evento, ou null se não houver. */
function encontrarAta(evento) {
    if (!evento.attachments) {
        return null;
    }

    for (let i = 0; i < evento.attachments.length; i++) {
        const anexo = evento.attachments[i];
        if (!anexo.title) {
            continue;
        }

        const tituloMinusculo = anexo.title.toLowerCase();
        const ehAta = tituloMinusculo.includes(TITULO_DA_ATA);
        const ehGoogleDocs = anexo.mimeType === TIPO_GOOGLE_DOCS;

        if (ehAta && ehGoogleDocs) {
            return anexo;
        }
    }

    return null;
}

/** Devolve o horário de início ou fim do evento, seja ele com hora marcada ou de dia inteiro. */
function horarioDoEvento(ponta) {
    if (!ponta) {
        return null;
    }

    if (ponta.dateTime) {
        return ponta.dateTime;
    }

    if (ponta.date) {
        return ponta.date;
    }

    return null;
}

/** Mantém só as reuniões que já terminaram e têm Anotações do Gemini anexadas. */
export function selecionarReunioesComAta(eventos, agora) {
    const reunioes = [];

    for (let i = 0; i < eventos.length; i++) {
        const evento = eventos[i];
        const fim = horarioDoEvento(evento.end);
        if (fim === null) {
            continue;
        }

        const dataDoFim = new Date(fim);
        const aindaNaoTerminou = dataDoFim > agora;
        if (aindaNaoTerminou) {
            continue;
        }

        const ata = encontrarAta(evento);
        if (ata === null) {
            continue;
        }

        let idDoDocumento = ata.fileId;
        if (!idDoDocumento) {
            idDoDocumento = extrairIdDoDocumento(ata.fileUrl);
        }

        let titulo = evento.summary;
        if (!titulo) {
            titulo = '(sem título)';
        }

        const inicio = horarioDoEvento(evento.start);
        const data = formatarData(inicio);

        const reuniao = {
            titulo: titulo,
            data: data,
            linkDaAta: ata.fileUrl,
            idDoDocumento: idDoDocumento,
        };

        reunioes.push(reuniao);
    }

    return reunioes;
}
