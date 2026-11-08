const LIMITE_DO_DISCORD = 2000;

/** Monta a lista de demandas de um lado da reunião, ou o aviso de que não há nenhuma. */
function montarListaDeDemandas(rotulo, demandas) {
    const linhas = [];
    linhas.push(rotulo + ':');

    const temDemandas = demandas && demandas.length > 0;
    if (temDemandas) {
        for (let i = 0; i < demandas.length; i++) {
            linhas.push('• ' + demandas[i]);
        }
    } else {
        linhas.push('• Nenhuma identificada');
    }

    linhas.push('');

    return linhas;
}

/** Monta a mensagem do Discord com o resumo e as demandas devolvidos pela IA. */
export function montarMensagem(reuniao, resultado, nomeDaEmpresa) {
    let linhas = [];
    linhas.push('📅 **Reunião com ' + reuniao.titulo + ' - ' + reuniao.data + '**');
    linhas.push('');

    let resumo = resultado.resumo;
    if (!resumo) {
        resumo = 'Nenhum identificado';
    }

    linhas.push('Resumo:');
    linhas.push(resumo);
    linhas.push('');

    const demandasDoCliente = montarListaDeDemandas('Demandas Cliente', resultado.demandasCliente);
    const demandasDaEmpresa = montarListaDeDemandas('Demandas ' + nomeDaEmpresa, resultado.demandasEmpresa);
    linhas = linhas.concat(demandasDoCliente);
    linhas = linhas.concat(demandasDaEmpresa);

    linhas.push('🔗 Ata completa: ' + reuniao.linkDaAta);

    return linhas.join('\n');
}

/** Monta a mensagem enviada quando não foi possível resumir a ata, com o motivo quando ele é conhecido. */
export function montarAvisoDeFalha(reuniao, motivo) {
    let mensagem = '📄 **Ata disponível: ' + reuniao.titulo + '**\n' + reuniao.data + '\n' + reuniao.linkDaAta;

    if (motivo) {
        mensagem = mensagem + '\n\n⚠️ ' + motivo;
    }

    return mensagem;
}

/** Divide a mensagem em partes de até 2.000 caracteres, cortando na última quebra de linha que couber. */
export function dividirMensagem(texto) {
    const partes = [];
    let restante = texto;

    while (restante.length > 0) {
        if (restante.length <= LIMITE_DO_DISCORD) {
            partes.push(restante);
            break;
        }

        let pontoDeCorte = restante.lastIndexOf('\n', LIMITE_DO_DISCORD);
        if (pontoDeCorte <= 0) {
            pontoDeCorte = LIMITE_DO_DISCORD;
        }

        partes.push(restante.slice(0, pontoDeCorte));
        restante = restante.slice(pontoDeCorte).trimStart();
    }

    return partes;
}
