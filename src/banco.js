import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PASTA_DO_SQL = path.join(import.meta.dirname, 'sql');

/** Lê um arquivo .sql da pasta src/sql. */
function lerSql(nomeDoArquivo) {
    const arquivo = path.join(PASTA_DO_SQL, nomeDoArquivo);

    return fs.readFileSync(arquivo, 'utf8');
}

const CRIAR_TABELA = lerSql('criar-tabela.sql');
const BUSCAR_ENVIO = lerSql('buscar-envio.sql');
const REGISTRAR_ENVIO = lerSql('registrar-envio.sql');

/** Abre o banco SQLite no arquivo informado, criando a pasta e a tabela quando ainda não existem. */
export function abrirBanco(arquivoDoBanco) {
    const pasta = path.dirname(arquivoDoBanco);
    fs.mkdirSync(pasta, { recursive: true });

    const banco = new DatabaseSync(arquivoDoBanco);
    banco.exec(CRIAR_TABELA);

    return banco;
}

/** Devolve o que identifica a ata no banco: o id do documento ou, na falta dele, o link. */
export function chaveDaAta(reuniao) {
    if (reuniao.idDoDocumento) {
        return reuniao.idDoDocumento;
    }

    return reuniao.linkDaAta;
}

/** Diz se a ata da reunião já foi enviada ao Discord. */
export function ataJaEnviada(banco, reuniao) {
    const consulta = banco.prepare(BUSCAR_ENVIO);
    const linha = consulta.get(chaveDaAta(reuniao));

    if (linha === undefined) {
        return false;
    }

    return true;
}

/** Registra que a ata da reunião foi enviada ao Discord no momento informado. */
export function registrarEnvio(banco, reuniao, momento) {
    const comando = banco.prepare(REGISTRAR_ENVIO);

    comando.run(chaveDaAta(reuniao), reuniao.titulo, reuniao.data, momento.toISOString());
}
