/**
 * Sistema de Inscrição e Votação de Delegados - Plano Diretor de Sapezal/MT
 * Arquivo: Codigo.gs (Roteador Principal e Utilitários de Banco de Dados)
 */

const APP_CONFIG = {
  TITLE: "Eleição de Delegados - Plano Diretor de Sapezal/MT",
  FOLDER_MATRIZ_NAME: "Sapezal_Delegados_Arquivos",
  FOLDER_DOCUMENTOS_NAME: "Documentos Pessoais (Restrito)",
  FOLDER_FOTOS_NAME: "Fotos de Divulgação (Publico)",
  SHEET_CONFIG: "Configuracoes",
  SHEET_INSCRICOES: "Inscricoes",
  SHEET_ELEITORES: "Eleitores_Votacao",
  SHEET_URNA: "Urna_Votos",
  DEFAULT_ADMIN_PIN: "2026", // Pode ser alterado na aba de Configurações
};

/**
 * Ponto de entrada do Web App
 */
function doGet(e) {
  try {
    const rawPage = (e && e.parameter && e.parameter.p) ? String(e.parameter.p).toLowerCase().trim() : '';
    // Acesso admin APENAS se explicitamente solicitado via ?p=admin
    const isAdminRoute = (rawPage === 'admin');
    
    // Consulta o status atual do sistema para definir a página padrão caso não seja especificada
    const statusResp = obterStatusSistema();
    const status = (statusResp && statusResp.data) ? statusResp.data : {};
    
    let defaultPage = 'inscricao';
    const now = new Date().getTime();
    const fimVot = status.votacao && status.votacao.fimRaw ? parseDateToTimestamp(status.votacao.fimRaw) : null;

    if (fimVot && now > fimVot) {
      // Votação já encerrou: página padrão passa a ser apuração
      defaultPage = 'apuracao';
    } else if (status.votacao && status.votacao.aberta) {
      // Votação está aberta no momento
      defaultPage = 'votacao';
    } else {
      defaultPage = 'inscricao';
    }

    const initialPage = isAdminRoute ? 'admin' : (rawPage || defaultPage);

    const template = HtmlService.createTemplateFromFile('Index');
    template.initialPage = initialPage;
    template.isAdminRoute = isAdminRoute ? 'true' : 'false';
    template.defaultPhase = defaultPage;

    return template.evaluate()
      .setTitle(APP_CONFIG.TITLE)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput("<p>Erro ao inicializar aplicativo: " + err.message + "</p>");
  }
}

/**
 * Mecanismo de inclusão modular de arquivos HTML (com suporte a scriptlets aninhados)
 */
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

/**
 * Retorna ou inicializa a planilha de banco de dados
 */
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SPREADSHEET_ID');
  
  if (ssId) {
    try {
      return SpreadsheetApp.openById(ssId);
    } catch (e) {
      console.warn("Spreadsheet ID inválido ou inacessível. Criando nova ou usando ativa...");
    }
  }
  
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      props.setProperty('SPREADSHEET_ID', active.getId());
      return active;
    }
  } catch (e) {}

  // Criação automática se não houver planilha vinculada
  const newSs = SpreadsheetApp.create("Banco_Dados_Delegados_Sapezal");
  props.setProperty('SPREADSHEET_ID', newSs.getId());
  initDatabase(newSs);
  return newSs;
}

/**
 * Inicialização e estruturação das abas do Google Sheets
 */
function initDatabase(ssInstance) {
  const ss = ssInstance || getSpreadsheet();

  // 1. Aba Configuracoes
  let sheetConfig = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
  if (!sheetConfig) {
    sheetConfig = ss.insertSheet(APP_CONFIG.SHEET_CONFIG);
    sheetConfig.appendRow(["Chave", "Valor", "Descricao"]);
    sheetConfig.appendRow(["DATA_INICIO_INSCRICAO", "2026-01-01T00:00", "Data e hora de abertura das inscrições"]);
    sheetConfig.appendRow(["DATA_FIM_INSCRICAO", "2026-12-31T23:59", "Data e hora de encerramento das inscrições"]);
    sheetConfig.appendRow(["DATA_INICIO_VOTACAO", "2026-10-15T08:00", "Data e hora de abertura da votação"]);
    sheetConfig.appendRow(["DATA_FIM_VOTACAO", "2026-10-21T17:00", "Data e hora de encerramento da votação"]);
    sheetConfig.appendRow(["ADMIN_PIN", APP_CONFIG.DEFAULT_ADMIN_PIN, "Senha/PIN para acesso da Comissão"]);
    sheetConfig.getRange("A1:C1").setFontWeight("bold").setBackground("#015797").setFontColor("#ffffff");
  }

  // 2. Aba Inscricoes (Sem coluna RG)
  let sheetInscricoes = ss.getSheetByName(APP_CONFIG.SHEET_INSCRICOES);
  if (!sheetInscricoes) {
    sheetInscricoes = ss.insertSheet(APP_CONFIG.SHEET_INSCRICOES);
    sheetInscricoes.appendRow([
      "Protocolo",
      "Timestamp",
      "Nome Completo",
      "Nome de Urna",
      "CPF",
      "Data Nascimento",
      "Telefone",
      "Email",
      "Bairro",
      "Segmento",
      "Apresentacao Minibiografia",
      "Link Doc Identidade",
      "Link Comprovante Residencia",
      "Link Declaracao Nao Cargo",
      "Link Foto Divulgacao",
      "Status", // Pendente, Diligência, Deferida, Indeferida
      "Parecer Comissao",
      "Data Atualizacao"
    ]);
    sheetInscricoes.getRange("A1:R1").setFontWeight("bold").setBackground("#015797").setFontColor("#ffffff");
    sheetInscricoes.setFrozenRows(1);
  }

  // 3. Aba Eleitores_Votacao (Registro de quem votou para impedir voto duplo)
  let sheetEleitores = ss.getSheetByName(APP_CONFIG.SHEET_ELEITORES);
  if (!sheetEleitores) {
    sheetEleitores = ss.insertSheet(APP_CONFIG.SHEET_ELEITORES);
    sheetEleitores.appendRow([
      "Protocolo Eleitor",
      "Timestamp",
      "Nome Eleitor",
      "CPF Mascarado",
      "Bairro",
      "Hash Comprovante"
    ]);
    sheetEleitores.getRange("A1:F1").setFontWeight("bold").setBackground("#072b4c").setFontColor("#ffffff");
    sheetEleitores.setFrozenRows(1);
  }

  // 4. Aba Urna_Votos (Votos estritamente anônimos, desvinculados de CPF)
  let sheetUrna = ss.getSheetByName(APP_CONFIG.SHEET_URNA);
  if (!sheetUrna) {
    sheetUrna = ss.insertSheet(APP_CONFIG.SHEET_URNA);
    sheetUrna.appendRow([
      "ID Voto",
      "Timestamp",
      "Protocolo Candidato",
      "Nome Candidato",
      "Bairro Candidato"
    ]);
    sheetUrna.getRange("A1:E1").setFontWeight("bold").setBackground("#409240").setFontColor("#ffffff");
    sheetUrna.setFrozenRows(1);
  }

  return { success: true, message: "Banco de dados inicializado com sucesso." };
}

/**
 * Obtém ou cria a estrutura de pastas no Google Drive
 */
function getDriveFolders() {
  const props = PropertiesService.getScriptProperties();
  let matrizId = props.getProperty('FOLDER_MATRIZ_ID');
  let matrizFolder;

  if (matrizId) {
    try {
      matrizFolder = DriveApp.getFolderById(matrizId);
    } catch (e) {
      console.warn("Pasta matriz ID inválida. Criando nova...");
    }
  }

  if (!matrizFolder) {
    const existing = DriveApp.getFoldersByName(APP_CONFIG.FOLDER_MATRIZ_NAME);
    if (existing.hasNext()) {
      matrizFolder = existing.next();
    } else {
      matrizFolder = DriveApp.createFolder(APP_CONFIG.FOLDER_MATRIZ_NAME);
    }
    props.setProperty('FOLDER_MATRIZ_ID', matrizFolder.getId());
  }

  // Subpasta Documentos Pessoais (Restrita)
  let docFolder;
  const docIter = matrizFolder.getFoldersByName(APP_CONFIG.FOLDER_DOCUMENTOS_NAME);
  if (docIter.hasNext()) {
    docFolder = docIter.next();
  } else {
    docFolder = matrizFolder.createFolder(APP_CONFIG.FOLDER_DOCUMENTOS_NAME);
  }

  // Subpasta Fotos de Divulgação (Pública apenas para leitura)
  let fotoFolder;
  const fotoIter = matrizFolder.getFoldersByName(APP_CONFIG.FOLDER_FOTOS_NAME);
  if (fotoIter.hasNext()) {
    fotoFolder = fotoIter.next();
  } else {
    fotoFolder = matrizFolder.createFolder(APP_CONFIG.FOLDER_FOTOS_NAME);
    fotoFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  return {
    matriz: matrizFolder,
    documentos: docFolder,
    fotos: fotoFolder
  };
}

/**
 * Converte com segurança qualquer valor de data/hora (Date, string ISO, string BR) para timestamp em ms
 */
function parseDateToTimestamp(val) {
  if (!val) return null;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (!s) return null;

  // Formato ISO: YYYY-MM-DDTHH:mm ou YYYY-MM-DDTHH:mm:ss ou YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // Formato Brasileiro: DD/MM/YYYY HH:mm:ss ou DD/MM/YYYY HH:mm ou DD/MM/YYYY
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 0;
    const min = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
    const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback.getTime();
}

/**
 * Converte qualquer valor de data para string no formato datetime-local (YYYY-MM-DDTHH:mm)
 */
function formatDateToInput(val) {
  if (!val) return "";
  let d;
  if (val instanceof Date) {
    d = val;
  } else {
    const ts = parseDateToTimestamp(val);
    if (!ts) return String(val || "");
    d = new Date(ts);
  }
  try {
    return Utilities.formatDate(d, "America/Cuiaba", "yyyy-MM-dd'T'HH:mm");
  } catch (e) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

/**
 * Converte qualquer valor de data para exibição amigável em pt-BR (DD/MM/YYYY HH:mm)
 */
function formatDateToDisplay(val, includeTime) {
  if (!val) return "";
  let d;
  if (val instanceof Date) {
    d = val;
  } else {
    const ts = parseDateToTimestamp(val);
    if (!ts) return String(val || "");
    d = new Date(ts);
  }
  try {
    return Utilities.formatDate(d, "America/Cuiaba", includeTime !== false ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy");
  } catch (e) {
    return String(val);
  }
}

/**
 * Consulta status e prazos do sistema
 */
function obterStatusSistema() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    if (!sheet) {
      initDatabase(ss);
      sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    }

    const data = sheet.getDataRange().getValues();
    const config = {};
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        config[String(data[i][0]).trim()] = data[i][1];
      }
    }

    const now = new Date().getTime();
    const inicioInsc = parseDateToTimestamp(config.DATA_INICIO_INSCRICAO);
    const fimInsc = parseDateToTimestamp(config.DATA_FIM_INSCRICAO);
    const inicioVot = parseDateToTimestamp(config.DATA_INICIO_VOTACAO);
    const fimVot = parseDateToTimestamp(config.DATA_FIM_VOTACAO);

    // Se a data de início foi configurada, valida; senão, default aberto
    const inscricaoAberta = (inicioInsc === null || now >= inicioInsc) && (fimInsc === null || now <= fimInsc);
    const votacaoAberta = (inicioVot === null || now >= inicioVot) && (fimVot === null || now <= fimVot);

    return {
      success: true,
      data: {
        now: formatDateToDisplay(new Date(), true),
        inscricao: {
          aberta: Boolean(inscricaoAberta),
          inicio: formatDateToDisplay(config.DATA_INICIO_INSCRICAO, true),
          fim: formatDateToDisplay(config.DATA_FIM_INSCRICAO, true),
          inicioRaw: formatDateToInput(config.DATA_INICIO_INSCRICAO),
          fimRaw: formatDateToInput(config.DATA_FIM_INSCRICAO)
        },
        votacao: {
          aberta: Boolean(votacaoAberta),
          inicio: formatDateToDisplay(config.DATA_INICIO_VOTACAO, true),
          fim: formatDateToDisplay(config.DATA_FIM_VOTACAO, true),
          inicioRaw: formatDateToInput(config.DATA_INICIO_VOTACAO),
          fimRaw: formatDateToInput(config.DATA_FIM_VOTACAO)
        }
      }
    };
  } catch (e) {
    return {
      success: false,
      message: "Erro ao consultar status: " + e.message,
      data: {
        inscricao: { aberta: true, inicio: "", fim: "" },
        votacao: { aberta: true, inicio: "", fim: "" }
      }
    };
  }
}


