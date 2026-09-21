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
    let sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    if (!sheet) {
      initDatabase(ss);
      sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    }

    const rows = sheet.getDataRange().getValues();
    let savedPin = APP_CONFIG.DEFAULT_ADMIN_PIN;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === "ADMIN_PIN") {
        savedPin = String(rows[i][1]).trim();
        break;
      }
    }

    if (String(pin).trim() === savedPin) {
      return { success: true, message: "Acesso autorizado com sucesso." };
    } else {
      return { success: false, message: "PIN incorreto. Tente novamente." };
    }
  } catch (err) {
    return { success: false, message: "Erro de autenticação: " + err.message };
  }
}

/**
 * Retorna as configurações e prazos atuais para o formulário do painel Admin
 */
function adminObterConfiguracoes() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    if (!sheet) {
      initDatabase(ss);
      sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    }

    const rows = sheet.getDataRange().getValues();
    const config = {};
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) {
        config[String(rows[i][0]).trim()] = rows[i][1];
      }
    }

    return {
      success: true,
      data: {
        DATA_INICIO_INSCRICAO: formatDateToInput(config.DATA_INICIO_INSCRICAO),
        DATA_FIM_INSCRICAO: formatDateToInput(config.DATA_FIM_INSCRICAO),
        DATA_INICIO_VOTACAO: formatDateToInput(config.DATA_INICIO_VOTACAO),
        DATA_FIM_VOTACAO: formatDateToInput(config.DATA_FIM_VOTACAO),
        ADMIN_PIN: String(config.ADMIN_PIN || APP_CONFIG.DEFAULT_ADMIN_PIN)
      }
    };
  } catch (err) {
    return { success: false, message: "Erro ao obter configurações: " + err.message };
  }
}

/**
 * Normaliza strings para comparação (remove acentos e espaços, lowercase)
 */
function normalizarTexto(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Extrai URL direta da imagem para exibição imediata em tags <img>
 */
function formatarUrlImagemDrive(url) {
  if (!url) return "";
  const s = String(url).trim();
  if (!s) return "";
  if (s.startsWith("data:") || s.startsWith("blob:") || s.includes("googleusercontent.com/d/")) return s;
  
  const match = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                s.match(/id=([a-zA-Z0-9_-]+)/) || 
                s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  
  if (match && match[1]) {
    return "https://lh3.googleusercontent.com/d/" + match[1];
  }
  return s;
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

    const filtroNorm = normalizarTexto(filtroStatus);
    const lista = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Pula linhas totalmente vazias
      if (!row[0] && !row[2]) continue;

      const status = String(row[15] || "Pendente").trim();
      const statusNorm = normalizarTexto(status);

      const atendeFiltro = (!filtroNorm || filtroNorm === 'todos' || statusNorm === filtroNorm);

      if (atendeFiltro) {
        lista.push({
          protocolo: String(row[0] || ""),
          timestamp: formatDateToDisplay(row[1], true),
          nomeCompleto: String(row[2] || ""),
          nomeUrna: String(row[3] || row[2] || ""),
          cpf: String(row[4] || ""),
          dataNasc: formatDateToDisplay(row[5], false),
          telefone: String(row[6] || ""),
          email: String(row[7] || ""),
          bairro: String(row[8] || ""),
          segmento: String(row[9] || "Sociedade Civil"),
          minibio: String(row[10] || ""),
          linkIdentidade: String(row[11] || ""),
          linkResidencia: String(row[12] || ""),
          linkDeclaracaoCargo: String(row[13] || ""),
          linkQuitacao: String(row[13] || ""),
          linkFoto: String(row[14] || ""),
          fotoThumbnail: formatarUrlImagemDrive(row[14]),
          status: status || "Pendente",
          parecer: String(row[16] || ""),
          dataAtualizacao: formatDateToDisplay(row[17], true)
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
    if (!sheet) return { success: false, message: "Planilha de inscrições não encontrada." };

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
    SpreadsheetApp.flush(); // Garante gravação imediata síncrona

    return {
      success: true,
      protocolo: protocolo,
      novoStatus: novoStatus,
      parecer: parecer || "",
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
    let sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    if (!sheet) {
      initDatabase(ss);
      sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    }

    const rows = sheet.getDataRange().getValues();
    const mapLinhas = {};
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) {
        mapLinhas[String(rows[i][0]).trim()] = i + 1;
      }
    }

    for (const key in configData) {
      if (configData.hasOwnProperty(key) && configData[key] !== undefined && configData[key] !== null) {
        const val = String(configData[key]).trim();
        // Não sobrescreve PIN se vier vazio
        if (key === 'ADMIN_PIN' && !val) continue;

        if (mapLinhas[key]) {
          sheet.getRange(mapLinhas[key], 2).setValue(val);
        } else {
          sheet.appendRow([key, val, ""]);
        }
      }
    }

    SpreadsheetApp.flush(); // Garante gravação imediata síncrona
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
      let total = 0;
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][0] && !rows[i][2]) continue;
        total++;
        const st = normalizarTexto(rows[i][15] || "Pendente"); // Coluna P (índice 15) é o Status!
        if (st === 'pendente') stats.pendentes++;
        else if (st === 'diligencia') stats.diligencias++;
        else if (st === 'deferida' || st === 'deferido' || st === 'aprovado' || st === 'aprovada') stats.deferidos++;
        else if (st === 'indeferida' || st === 'indeferido') stats.indeferidos++;
        else stats.pendentes++;
      }
      stats.totalInscritos = total;
    }

    if (sheetEleit) {
      const rows = sheetEleit.getDataRange().getValues();
      let totalEleit = 0;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] || rows[i][2]) totalEleit++;
      }
      stats.totalEleitores = totalEleit;
    }

    if (sheetUrna) {
      const rows = sheetUrna.getDataRange().getValues();
      let totalUrna = 0;
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][0] && !rows[i][2]) continue;
        totalUrna++;
        const candId = String(rows[i][2] || "");
        const candNome = String(rows[i][3] || "Candidato");
        const chave = candNome + " (" + candId + ")";
        stats.apuracaoVotos[chave] = (stats.apuracaoVotos[chave] || 0) + 1;
      }
      stats.totalVotosUrna = totalUrna;
    }

    return { success: true, data: stats };
  } catch (err) {
    return { success: false, message: "Erro ao compilar estatísticas: " + err.message };
  }
}


