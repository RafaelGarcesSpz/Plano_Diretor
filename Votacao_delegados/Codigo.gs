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
    const page = (e && e.parameter && e.parameter.p) ? e.parameter.p : 'home';
    const template = HtmlService.createTemplateFromFile('Index');
    template.initialPage = page;

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
    sheetConfig.appendRow(["DATA_INICIO_VOTACAO", "2026-01-01T00:00", "Data e hora de abertura da votação"]);
    sheetConfig.appendRow(["DATA_FIM_VOTACAO", "2026-12-31T23:59", "Data e hora de encerramento da votação"]);
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
      "Link Certidao Quitacao",
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
 * Consulta status e prazos do sistema
 */
function obterStatusSistema() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    if (!sheet) {
      initDatabase(ss);
      return obterStatusSistema();
    }

    const data = sheet.getDataRange().getValues();
    const config = {};
    for (let i = 1; i < data.length; i++) {
      config[data[i][0]] = data[i][1];
    }

    const now = new Date().getTime();
    const inicioInsc = new Date(config.DATA_INICIO_INSCRICAO || 0).getTime();
    const fimInsc = new Date(config.DATA_FIM_INSCRICAO || 0).getTime();
    const inicioVot = new Date(config.DATA_INICIO_VOTACAO || 0).getTime();
    const fimVot = new Date(config.DATA_FIM_VOTACAO || 0).getTime();

    const inscricaoAberta = (now >= inicioInsc && now <= fimInsc);
    const votacaoAberta = (now >= inicioVot && now <= fimVot);

    return {
      success: true,
      data: {
        now: new Date().toISOString(),
        inscricao: {
          aberta: inscricaoAberta,
          inicio: config.DATA_INICIO_INSCRICAO,
          fim: config.DATA_FIM_INSCRICAO
        },
        votacao: {
          aberta: votacaoAberta,
          inicio: config.DATA_INICIO_VOTACAO,
          fim: config.DATA_FIM_VOTACAO
        }
      }
    };
  } catch (e) {
    return {
      success: false,
      message: "Erro ao consultar status: " + e.message,
      data: {
        inscricao: { aberta: true },
        votacao: { aberta: true }
      }
    };
  }
}

