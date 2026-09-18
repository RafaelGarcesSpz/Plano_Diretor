/**
 * Sistema de Inscrição e Votação de Delegados - Plano Diretor de Sapezal/MT
 * Arquivo: Controller_Inscricao.gs (Lógica de Inscrição de Candidatos)
 */

/**
 * Validação do algoritmo do CPF brasileiro
 */
function validarCPF(cpf) {
  if (!cpf) return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

  let soma = 0;
  let resto;
  for (let i = 1; i <= 9; i++) {
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

/**
 * Salva arquivo a partir de string Base64 em pasta do Drive
 */
function salvarArquivoDrive(pasta, base64Data, nomeArquivo, mimeTypePadrao) {
  if (!base64Data || typeof base64Data !== 'string') return "";
  
  let cleanBase64 = base64Data;
  let mimeType = mimeTypePadrao || 'application/octet-stream';
  
  // Extrai MIME type caso venha no formato DataURL: data:image/png;base64,...
  if (base64Data.indexOf(';base64,') !== -1) {
    const parts = base64Data.split(';base64,');
    mimeType = parts[0].replace('data:', '');
    cleanBase64 = parts[1];
  }

  const bytes = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(bytes, mimeType, nomeArquivo);
  const file = pasta.createFile(blob);
  return file.getUrl();
}

/**
 * Endpoint principal de submissão da inscrição
 */
function salvarInscricao(payload) {
  const lock = LockService.getScriptLock();
  
  // Tenta obter lock por até 30 segundos para evitar concorrência
  try {
    const lockAcquired = lock.tryLock(30000);
    if (!lockAcquired) {
      return {
        success: false,
        message: "O servidor está ocupado processando outras inscrições. Por favor, tente novamente em alguns instantes."
      };
    }

    // 1. Verificação de Prazo Oficial
    const status = obterStatusSistema();
    if (status.success && !status.data.inscricao.aberta) {
      return {
        success: false,
        message: "O período oficial de inscrições de delegados encontra-se encerrado ou não iniciado."
      };
    }

    // 2. Validações básicas de preenchimento
    if (!payload || !payload.dadosPessoais || !payload.dadosDivulgacao) {
      return {
        success: false,
        message: "Dados de inscrição incompletos ou corrompidos."
      };
    }

    const dp = payload.dadosPessoais;
    const dd = payload.dadosDivulgacao;
    const arq = payload.arquivosUpload || {};
    const dec = payload.declaracoes || {};

    if (!dp.nomeCompleto || !dp.cpf || !dp.bairro || !dp.telefone) {
      return {
        success: false,
        message: "Campos obrigatórios de identificação não foram preenchidos."
      };
    }

    // Valida CPF
    const cpfLimpo = dp.cpf.replace(/[^\d]/g, '');
    if (!validarCPF(cpfLimpo)) {
      return {
        success: false,
        message: "O CPF informado é inválido. Por favor, revise seus dados."
      };
    }

    // Verifica declarações obrigatórias
    if (!dec.residencia || !dec.maioridade || !dec.veracidade || !dec.lgpd) {
      return {
        success: false,
        message: "Todas as declarações de compromisso e termos da Lei do Plano Diretor devem ser aceitas."
      };
    }

    // 3. Verificação de Duplicidade de CPF na aba Inscricoes
    const ss = getSpreadsheet();
    const sheetInscricoes = ss.getSheetByName(APP_CONFIG.SHEET_INSCRICOES);
    const dadosExistentes = sheetInscricoes.getDataRange().getValues();

    // Coluna E (índice 4) armazena o CPF
    for (let i = 1; i < dadosExistentes.length; i++) {
      const cpfLinha = String(dadosExistentes[i][4]).replace(/[^\d]/g, '');
      if (cpfLinha === cpfLimpo) {
        return {
          success: false,
          message: "Já existe uma inscrição registrada para este CPF com o protocolo: " + dadosExistentes[i][0]
        };
      }
    }

    // 4. Geração de Protocolo Único
    const anoAtual = new Date().getFullYear();
    const numeroAleatorio = Math.floor(10000 + Math.random() * 90000);
    const protocolo = "DEL-" + anoAtual + "-" + numeroAleatorio;

    // 5. Upload Seguro dos Arquivos no Google Drive
    const pastas = getDriveFolders();
    const nomePrefixo = protocolo + "_" + cpfLimpo.substring(0, 6);

    let urlIdentidade = "";
    let urlResidencia = "";
    let urlCertidao = "";
    let urlFoto = "";

    if (arq.docIdentidade) {
      urlIdentidade = salvarArquivoDrive(
        pastas.documentos,
        arq.docIdentidade,
        nomePrefixo + "_Identidade",
        arq.docIdentidadeType
      );
    }

    if (arq.compResidencia) {
      urlResidencia = salvarArquivoDrive(
        pastas.documentos,
        arq.compResidencia,
        nomePrefixo + "_Residencia",
        arq.compResidenciaType
      );
    }

    if (arq.certQuitacao) {
      urlCertidao = salvarArquivoDrive(
        pastas.documentos,
        arq.certQuitacao,
        nomePrefixo + "_Quitacao",
        arq.certQuitacaoType
      );
    }

    if (arq.fotoRosto) {
      urlFoto = salvarArquivoDrive(
        pastas.fotos,
        arq.fotoRosto,
        nomePrefixo + "_FotoDivulgacao",
        arq.fotoRostoType
      );
    }

    // 6. Registro na Planilha (18 colunas sem RG)
    const timestamp = Utilities.formatDate(new Date(), "America/Cuiaba", "dd/MM/yyyy HH:mm:ss");
    
    sheetInscricoes.appendRow([
      protocolo,
      timestamp,
      dp.nomeCompleto.trim(),
      dd.nomeUrna ? dd.nomeUrna.trim() : dp.nomeCompleto.trim(),
      dp.cpf,
      dp.dataNasc || "",
      dp.telefone,
      dp.email || "",
      dp.bairro,
      dp.segmento || "Sociedade Civil",
      dd.minibio ? dd.minibio.trim() : "",
      urlIdentidade,
      urlResidencia,
      urlCertidao,
      urlFoto,
      "Pendente", // Status inicial
      "", // Parecer comissão vazio
      timestamp
    ]);

    return {
      success: true,
      protocolo: protocolo,
      nome: dp.nomeCompleto,
      bairro: dp.bairro,
      timestamp: timestamp,
      message: "Inscrição realizada com sucesso! Guarde o seu protocolo para acompanhamento."
    };

  } catch (err) {
    console.error("Erro em salvarInscricao: " + err);
    return {
      success: false,
      message: "Erro interno no servidor: " + err.message
    };
  } finally {
    lock.releaseLock();
  }
}

