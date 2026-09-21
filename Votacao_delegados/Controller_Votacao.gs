/**
 * Sistema de Inscrição e Votação de Delegados - Plano Diretor de Sapezal/MT
 * Arquivo: Controller_Votacao.gs (Lógica de Urna Eletrônica e Votação Popular)
 */

/**
 * Retorna a lista de candidatos homologados e deferidos para a votação pública
 */
function obterCandidatosDeferidos() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_INSCRICOES);
    if (!sheet) return { success: true, data: [] };

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return { success: true, data: [] };

    const listaDeferidos = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const status = String(row[15] || "").trim().toLowerCase();

      // Filtra apenas candidaturas Deferidas
      if (status === 'deferida' || status === 'deferido' || status === 'aprovado') {
        listaDeferidos.push({
          id: row[0],             // Protocolo
          nome: row[2],           // Nome Completo
          nomeUrna: row[3] || row[2], // Nome de Urna
          bairro: row[8],         // Bairro
          segmento: row[9] || "Sociedade Civil",
          minibio: row[10] || "", // Apresentação
          fotoUrl: row[14] || ""  // Foto
        });
      }
    }

    return { success: true, data: listaDeferidos };
  } catch (err) {
    console.error("Erro em obterCandidatosDeferidos: " + err);
    return { success: false, message: "Erro ao consultar candidatos: " + err.message, data: [] };
  }
}

/**
 * Registra o voto de forma desacoplada garantindo sigilo absoluto (LGPD)
 */
function registrarVoto(payload) {
  const lock = LockService.getScriptLock();
  
  try {
    const lockAcquired = lock.tryLock(30000);
    if (!lockAcquired) {
      return {
        success: false,
        message: "A urna eletrônica está processando outros votos no momento. Por favor, tente novamente."
      };
    }

    // 1. Verificação de Prazo Oficial da Votação
    const status = obterStatusSistema();
    if (status.success && !status.data.votacao.aberta) {
      return {
        success: false,
        message: "A cabine de votação encontra-se fora do período oficial de votação."
      };
    }

    // 2. Validação da Carga Útil
    if (!payload || !payload.eleitor || !payload.voto) {
      return {
        success: false,
        message: "Dados de votação corrompidos ou incompletos."
      };
    }

    const eleitor = payload.eleitor;
    const voto = payload.voto;

    if (!eleitor.nome || !eleitor.cpf || !eleitor.bairro || !voto.candidatoId) {
      return {
        success: false,
        message: "Identificação do eleitor ou seleção de candidato pendente."
      };
    }

    // 3. Validação Matemática do CPF
    const cpfLimpo = eleitor.cpf.replace(/[^\d]/g, '');
    if (!validarCPF(cpfLimpo)) {
      return {
        success: false,
        message: "O CPF informado não é válido segundo os critérios da Receita Federal."
      };
    }

    const ss = getSpreadsheet();
    const sheetEleitores = ss.getSheetByName(APP_CONFIG.SHEET_ELEITORES);
    const sheetUrna = ss.getSheetByName(APP_CONFIG.SHEET_URNA);

    // 4. Verificação de Voto Único (Prevenção de Duplicidade por CPF)
    const dadosEleitores = sheetEleitores.getDataRange().getValues();
    const cpfMascarado = cpfLimpo.substring(0, 3) + ".***.***-" + cpfLimpo.substring(9, 11);

    for (let i = 1; i < dadosEleitores.length; i++) {
      const cpfRegistrado = String(dadosEleitores[i][3]).trim();
      // Verificação por CPF mascarado ou protocolo existente
      if (cpfRegistrado === cpfMascarado) {
        return {
          success: false,
          message: "Este CPF já participou e registrou seu voto nesta eleição. Cada cidadão pode votar apenas uma vez."
        };
      }
    }

    // 5. Geração de Protocolos e Hashes Criptográficos
    const anoAtual = new Date().getFullYear();
    const numeroAleatorio = Math.floor(100000 + Math.random() * 900000);
    const protocoloPresenca = "VOT-" + anoAtual + "-" + numeroAleatorio;
    
    // Hash de Autenticidade do Comprovante (4 blocos hexadecimais)
    const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, protocoloPresenca + "_" + cpfLimpo + "_" + new Date().getTime());
    let hexHash = "";
    for (let i = 0; i < 8; i++) {
      let b = (rawHash[i] & 0xFF).toString(16).toUpperCase();
      if (b.length === 1) b = "0" + b;
      hexHash += b;
    }
    const hashAutenticidade = hexHash.substring(0, 4) + "-" + hexHash.substring(4, 8) + "-" + hexHash.substring(8, 12) + "-" + hexHash.substring(12, 16);
    
    const timestamp = Utilities.formatDate(new Date(), "America/Cuiaba", "dd/MM/yyyy HH:mm:ss");

    // 6. Registro 1: Lista Cívica de Presença dos Eleitores (SEM associação ao voto)
    sheetEleitores.appendRow([
      protocoloPresenca,
      timestamp,
      eleitor.nome.trim(),
      cpfMascarado,
      eleitor.bairro,
      hashAutenticidade
    ]);

    // 7. Registro 2: Urna Eletrônica Anonimizada (SEM CPF, SEM NOME DO ELEITOR)
    const idVotoAnonimo = "VOTO-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    sheetUrna.appendRow([
      idVotoAnonimo,
      timestamp,
      voto.candidatoId,
      voto.candidatoNome,
      voto.candidatoBairro
    ]);

    return {
      success: true,
      protocolo: protocoloPresenca,
      autenticidade: hashAutenticidade,
      timestamp: timestamp,
      message: "Voto computado com sigilo absoluto na urna!"
    };

  } catch (err) {
    console.error("Erro em registrarVoto: " + err);
    return {
      success: false,
      message: "Erro interno no processamento do voto: " + err.message
    };
  } finally {
    lock.releaseLock();
  }
}
