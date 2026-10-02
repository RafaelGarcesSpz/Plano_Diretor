/**
 * Sistema de Inscrição e Votação de Delegados - Plano Diretor de Sapezal/MT
 * Arquivo: Controller_Admin.gs (Módulo de Gestão da Comissão Eleitoral)
 */

/**
 * Validação segura de PIN de acesso da Comissão Eleitoral
 */
function validarAdminPin(pin) {
  if (!pin) return false;
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

    return String(pin).trim() === savedPin;
  } catch (err) {
    console.error("Erro na verificação do PIN: " + err);
    return false;
  }
}

/**
 * Validação de PIN de acesso da Comissão
 */
function adminLogin(pin) {
  try {
    if (validarAdminPin(pin)) {
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
function adminObterConfiguracoes(pin) {
  if (!validarAdminPin(pin)) {
    return { success: false, message: "Acesso não autorizado. PIN inválido ou sessão expirada." };
  }
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
        TOTAL_VAGAS: String(config.TOTAL_VAGAS || "8"),
        ADMIN_PIN: "" // Não expõe o PIN atual via rede por segurança
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
 * Mapeia dinamicamente os índices das colunas da aba Inscricoes baseado nos cabeçalhos
 */
function mapearColunasInscricoes(headerRow) {
  const map = {
    protocolo: 0,
    timestamp: 1,
    nomeCompleto: 2,
    nomeUrna: 3,
    cpf: 4,
    dataNasc: 5,
    telefone: 6,
    email: 7,
    bairro: 8,
    segmento: 9,
    minibio: 10,
    linkIdentidade: 11,
    linkResidencia: 12,
    linkDeclaracaoCargo: 13,
    linkFoto: 14,
    status: 15,
    parecer: 16,
    dataAtualizacao: 17
  };

  if (!headerRow || headerRow.length === 0) return map;

  const normalized = headerRow.map(h => normalizarTexto(h));

  normalized.forEach((h, idx) => {
    if (h.includes("protocolo")) map.protocolo = idx;
    else if (h.includes("timestamp") || h.includes("data/hora") || h.includes("carimbo")) map.timestamp = idx;
    else if (h.includes("nome de urna") || h.includes("nome urna") || h.includes("apelido")) map.nomeUrna = idx;
    else if (h.includes("nome completo") || h === "nome") map.nomeCompleto = idx;
    else if (h.includes("cpf")) map.cpf = idx;
    else if (h.includes("nascimento") || h.includes("data nasc")) map.dataNasc = idx;
    else if (h.includes("telefone") || h.includes("whatsapp") || h.includes("celular")) map.telefone = idx;
    else if (h.includes("email") || h.includes("e-mail")) map.email = idx;
    else if (h.includes("bairro") || h.includes("comunidade")) map.bairro = idx;
    else if (h.includes("segmento")) map.segmento = idx;
    else if (h.includes("minibiografia") || h.includes("apresentacao") || h.includes("proposta")) map.minibio = idx;
    else if (h.includes("identidade") || h.includes("rg") || h.includes("doc")) map.linkIdentidade = idx;
    else if (h.includes("residencia") || h.includes("comprovante")) map.linkResidencia = idx;
    else if (h.includes("cargo") || h.includes("quitacao") || h.includes("declaracao nao")) map.linkDeclaracaoCargo = idx;
    else if (h.includes("foto") || h.includes("divulgacao") || h.includes("imagem")) map.linkFoto = idx;
    else if (h === "status" || h.includes("status")) map.status = idx;
    else if (h.includes("parecer")) map.parecer = idx;
    else if (h.includes("atualizacao") || h.includes("atualizado")) map.dataAtualizacao = idx;
  });

  return map;
}

/**
 * Lista todas as inscrições com suporte a filtro por status
 */
function adminListarInscricoes(pin, filtroStatus) {
  if (!validarAdminPin(pin)) {
    return { success: false, message: "Acesso não autorizado. PIN inválido ou sessão expirada.", data: [] };
  }
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_INSCRICOES);
    if (!sheet) return { success: true, data: [] };

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return { success: true, data: [] };

    const map = mapearColunasInscricoes(rows[0]);
    const filtroNorm = normalizarTexto(filtroStatus);
    const lista = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Pula linhas totalmente vazias
      if (!row[map.protocolo] && !row[map.nomeCompleto]) continue;

      const rawStatus = row[map.status] !== undefined && row[map.status] !== null && String(row[map.status]).trim() !== "" 
        ? String(row[map.status]).trim() 
        : "Pendente";
      const statusNorm = normalizarTexto(rawStatus);

      const atendeFiltro = (!filtroNorm || filtroNorm === 'todos' || statusNorm === filtroNorm);

      if (atendeFiltro) {
        lista.push({
          protocolo: String(row[map.protocolo] || ""),
          timestamp: formatDateToDisplay(row[map.timestamp], true),
          nomeCompleto: String(row[map.nomeCompleto] || ""),
          nomeUrna: String(row[map.nomeUrna] || row[map.nomeCompleto] || ""),
          cpf: String(row[map.cpf] || ""),
          dataNasc: formatDateToDisplay(row[map.dataNasc], false),
          telefone: String(row[map.telefone] || ""),
          email: String(row[map.email] || ""),
          bairro: String(row[map.bairro] || ""),
          segmento: String(row[map.segmento] || "Sociedade Civil"),
          minibio: String(row[map.minibio] || ""),
          linkIdentidade: String(row[map.linkIdentidade] || ""),
          linkResidencia: String(row[map.linkResidencia] || ""),
          linkDeclaracaoCargo: String(row[map.linkDeclaracaoCargo] || ""),
          linkQuitacao: String(row[map.linkDeclaracaoCargo] || ""),
          linkFoto: String(row[map.linkFoto] || ""),
          fotoThumbnail: formatarUrlImagemDrive(row[map.linkFoto]),
          status: rawStatus,
          parecer: String(row[map.parecer] || ""),
          dataAtualizacao: formatDateToDisplay(row[map.dataAtualizacao], true)
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
function adminAtualizarStatus(pin, protocolo, novoStatus, parecer) {
  if (!validarAdminPin(pin)) {
    return { success: false, message: "Acesso não autorizado. PIN inválido ou sessão expirada." };
  }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_INSCRICOES);
    if (!sheet) return { success: false, message: "Planilha de inscrições não encontrada." };

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return { success: false, message: "Nenhum registro localizado." };

    const map = mapearColunasInscricoes(rows[0]);
    let linhaEncontrada = -1;

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][map.protocolo]).trim() === String(protocolo).trim()) {
        linhaEncontrada = i + 1; // +1 devido à base 1 do Sheets
        break;
      }
    }

    if (linhaEncontrada === -1) {
      return { success: false, message: "Inscrição não localizada com o protocolo: " + protocolo };
    }

    const timestamp = Utilities.formatDate(new Date(), "America/Cuiaba", "dd/MM/yyyy HH:mm:ss");
    
    // Atualiza coluna de Status (+1 para 1-based no getRange)
    sheet.getRange(linhaEncontrada, map.status + 1).setValue(novoStatus);
    
    // Atualiza coluna de Parecer
    if (map.parecer !== undefined && map.parecer !== -1) {
      sheet.getRange(linhaEncontrada, map.parecer + 1).setValue(parecer || "");
    }
    
    // Atualiza coluna de Data Atualização
    if (map.dataAtualizacao !== undefined && map.dataAtualizacao !== -1) {
      sheet.getRange(linhaEncontrada, map.dataAtualizacao + 1).setValue(timestamp);
    }

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
function adminSalvarConfiguracoes(pin, configData) {
  if (!validarAdminPin(pin)) {
    return { success: false, message: "Acesso não autorizado. PIN inválido ou sessão expirada." };
  }
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
function adminObterEstatisticas(pin) {
  if (!validarAdminPin(pin)) {
    return { success: false, message: "Acesso não autorizado. PIN inválido ou sessão expirada." };
  }
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
      if (rows.length > 1) {
        const map = mapearColunasInscricoes(rows[0]);
        let total = 0;
        for (let i = 1; i < rows.length; i++) {
          if (!rows[i][map.protocolo] && !rows[i][map.nomeCompleto]) continue;
          total++;
          const rawSt = rows[i][map.status] !== undefined && rows[i][map.status] !== null && String(rows[i][map.status]).trim() !== ""
            ? String(rows[i][map.status]).trim()
            : "Pendente";
          const st = normalizarTexto(rawSt);
          if (st === 'pendente') stats.pendentes++;
          else if (st === 'diligencia') stats.diligencias++;
          else if (st === 'deferida' || st === 'deferido' || st === 'aprovado' || st === 'aprovada' || st === 'homologado' || st === 'homologada') stats.deferidos++;
          else if (st === 'indeferida' || st === 'indeferido') stats.indeferidos++;
          else stats.pendentes++;
        }
        stats.totalInscritos = total;
      }
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


