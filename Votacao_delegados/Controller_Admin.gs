/**
 * Sistema de Inscrição e Votação de Delegados - Plano Diretor de Sapezal/MT
 * Arquivo: Controller_Admin.gs (Módulo de Gestão da Comissão Eleitoral)
 */

/**
 * Validação de PIN de acesso da Comissão
 */
function adminLogin(pin) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    if (!sheet) return { success: false, message: "Aba de configurações não encontrada." };

    const rows = sheet.getDataRange().getValues();
    let savedPin = APP_CONFIG.DEFAULT_ADMIN_PIN;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === "ADMIN_PIN") {
        savedPin = String(rows[i][1]);
        break;
      }
    }

    if (String(pin).trim() === savedPin.trim()) {
      return { success: true, message: "Acesso autorizado com sucesso." };
    } else {
      return { success: false, message: "PIN incorreto. Tente novamente." };
    }
  } catch (err) {
    return { success: false, message: "Erro de autenticação: " + err.message };
  }
}

/**
 * Lista todas as inscrições com suporte a filtro por status
 */
function adminListarInscricoes(filtroStatus) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_INSCRICOES);
    if (!sheet) return { success: true, data: [] };

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return { success: true, data: [] };

    const lista = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const status = String(row[15] || "Pendente").trim();

      if (!filtroStatus || filtroStatus === 'todos' || status.toLowerCase() === filtroStatus.toLowerCase()) {
        lista.push({
          protocolo: row[0],
          timestamp: row[1],
          nomeCompleto: row[2],
          nomeUrna: row[3],
          cpf: row[4],
          dataNasc: row[5],
          telefone: row[6],
          email: row[7],
          bairro: row[8],
          segmento: row[9],
          minibio: row[10],
          linkIdentidade: row[11],
          linkResidencia: row[12],
          linkQuitacao: row[13],
          linkFoto: row[14],
          status: status,
          parecer: row[16] || "",
          dataAtualizacao: row[17] || ""
        });
      }
    }

    return { success: true, data: lista };
  } catch (err) {
    return { success: false, message: "Erro ao listar inscrições: " + err.message, data: [] };
  }
}

/**
 * Atualiza status da candidatura (Deferida, Indeferida ou Diligência)
 */
function adminAtualizarStatus(protocolo, novoStatus, parecer) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_INSCRICOES);
    const rows = sheet.getDataRange().getValues();

    let linhaEncontrada = -1;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === String(protocolo).trim()) {
        linhaEncontrada = i + 1; // +1 devido à base 1 do Sheets
        break;
      }
    }

    if (linhaEncontrada === -1) {
      return { success: false, message: "Inscrição não localizada com o protocolo: " + protocolo };
    }

    const timestamp = Utilities.formatDate(new Date(), "America/Cuiaba", "dd/MM/yyyy HH:mm:ss");
    sheet.getRange(linhaEncontrada, 16).setValue(novoStatus); // Coluna P: Status
    sheet.getRange(linhaEncontrada, 17).setValue(parecer || ""); // Coluna Q: Parecer
    sheet.getRange(linhaEncontrada, 18).setValue(timestamp); // Coluna R: Data Atualização

    return {
      success: true,
      message: `Candidatura ${protocolo} atualizada para "${novoStatus}" com sucesso!`
    };
  } catch (err) {
    return { success: false, message: "Erro ao atualizar status: " + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Atualiza prazos e configurações do sistema
 */
function adminSalvarConfiguracoes(configData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    if (!sheet) return { success: false, message: "Planilha de configurações não encontrada." };

    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const key = rows[i][0];
      if (configData[key] !== undefined) {
        sheet.getRange(i + 1, 2).setValue(configData[key]);
      }
    }

    return { success: true, message: "Configurações e prazos atualizados com sucesso." };
  } catch (err) {
    return { success: false, message: "Erro ao salvar configurações: " + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Apuração e métricas consolidadas para a Comissão
 */
function adminObterEstatisticas() {
  try {
    const ss = getSpreadsheet();
    const sheetInsc = ss.getSheetByName(APP_CONFIG.SHEET_INSCRICOES);
    const sheetEleit = ss.getSheetByName(APP_CONFIG.SHEET_ELEITORES);
    const sheetUrna = ss.getSheetByName(APP_CONFIG.SHEET_URNA);

    const stats = {
      totalInscritos: 0,
      pendentes: 0,
      diligencias: 0,
      deferidos: 0,
      indeferidos: 0,
      totalEleitores: 0,
      totalVotosUrna: 0,
      apuracaoVotos: {}
    };

    if (sheetInsc) {
      const rows = sheetInsc.getDataRange().getValues();
      stats.totalInscritos = Math.max(0, rows.length - 1);
      for (let i = 1; i < rows.length; i++) {
        const st = String(rows[i][16] || "").toLowerCase();
        if (st === 'pendente') stats.pendentes++;
        else if (st === 'diligência' || st === 'diligencia') stats.diligencias++;
        else if (st === 'deferida' || st === 'aprovado' || st === 'deferido') stats.deferidos++;
        else if (st === 'indeferida') stats.indeferidos++;
      }
    }

    if (sheetEleit) {
      const rows = sheetEleit.getDataRange().getValues();
      stats.totalEleitores = Math.max(0, rows.length - 1);
    }

    if (sheetUrna) {
      const rows = sheetUrna.getDataRange().getValues();
      stats.totalVotosUrna = Math.max(0, rows.length - 1);
      for (let i = 1; i < rows.length; i++) {
        const candId = rows[i][2];
        const candNome = rows[i][3];
        const chave = candNome + " (" + candId + ")";
        stats.apuracaoVotos[chave] = (stats.apuracaoVotos[chave] || 0) + 1;
      }
    }

    return { success: true, data: stats };
  } catch (err) {
    return { success: false, message: "Erro ao compilar estatísticas: " + err.message };
  }
}

