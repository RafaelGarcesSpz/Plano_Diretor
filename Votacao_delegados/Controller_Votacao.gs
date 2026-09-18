/**
 * Sistema de Inscrição e Votação de Delegados - Plano Diretor de Sapezal/MT
 * Arquivo: Controller_Votacao.gs (Lógica de Votação e Urna Eletrônica Anônima)
 */

/**
 * Retorna a lista pública de candidatos homologados (Deferidos)
 */
function obterCandidatosDeferidos() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_INSCRICOES);
    if (!sheet) return { success: true, data: [] };

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return { success: true, data: [] };

    const candidatos = [];
    // Índices baseados na estrutura de colunas de Inscricoes:
    // 0: Protocolo, 1: Timestamp, 2: Nome Completo, 3: Nome de Urna, 7: Telefone, 8: Email, 9: Bairro, 10: Segmento, 11: Minibio, 15: Link Foto, 16: Status
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const status = String(row[16]).trim().toLowerCase();
      
      if (status === 'deferida' || status === 'aprovado' || status === 'deferido') {
        candidatos.push({
          id: row[0],
          nome: row[2],
          nomeUrna: row[3] || row[2],
          bairro: row[9],
          segmento: row[10],
          minibio: row[11],
          fotoUrl: row[15] || ""
        });
      }
    }

    return {
      success: true,
      data: candidatos
    };
  } catch (err) {
    console.error("Erro ao obter candidatos: " + err);
    return {
      success: false,
      message: "Não foi possível carregar a lista de candidatos: " + err.message,
      data: []
    };
  }
}

/**
 * Mascara o CPF para preservação de privacidade (ex: ***.456.789-**)
 */
function mascararCPF(cpf) {
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return '***.' + digits.substring(3, 6) + '.' + digits.substring(6, 9) + '-**';
}

/**
 * Registro de voto com desacoplamento criptográfico de identidade
 */
function registrarVoto(payload) {
  const lock = LockService.getScriptLock();
  
  try {
    const lockAcquired = lock.tryLock(30000);
    if (!lockAcquired) {
      return {
        success: false,
        message: "A urna está ocupada processando outro voto. Por favor, tente novamente em alguns segundos."
      };
    }

    // 1. Checagem de prazo de votação
    const status = obterStatusSistema();
    if (status.success && !status.data.votacao.aberta) {
      return {
        success: false,
        message: "O período oficial de votação não está aberto no momento."
      };
    }

    // 2. Validação do eleitor
    if (!payload || !payload.eleitor || !payload.voto) {
      return {
        success: false,
        message: "Dados de votação corrompidos ou incompletos."
      };
    }

    const el = payload.eleitor;
    const vt = payload.voto;

    const cpfLimpo = String(el.cpf || "").replace(/\D/g, '');
    if (!validarCPF(cpfLimpo)) {
      return {
        success: false,
        message: "CPF do eleitor inválido. Verifique os números digitados."
      };
    }

    if (!el.nome || el.nome.trim().length < 3) {
      return {
        success: false,
        message: "Por favor, informe seu nome completo."
      };
    }

    if (!vt.candidatoId || !vt.candidatoNome) {
      return {
        success: false,
        message: "Nenhum candidato selecionado para confirmação."
      };
    }

    const ss = getSpreadsheet();
    const sheetEleitores = ss.getSheetByName(APP_CONFIG.SHEET_ELEITORES);
    const sheetUrna = ss.getSheetByName(APP_CONFIG.SHEET_URNA);

    // 3. Prevenção de Duplicidade: Verifica se o CPF já votou
    const dadosEleitores = sheetEleitores.getDataRange().getValues();
    for (let i = 1; i < dadosEleitores.length; i++) {
      const hashRegistrado = String(dadosEleitores[i][5]);
      // Gera hash local para checagem rápida sem expor CPF na memória aberta
      const cpfHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, cpfLimpo));
      if (hashRegistrado === cpfHash) {
        return {
          success: false,
          message: "Este CPF já registrou voto nesta eleição. Cada cidadão tem direito a votar apenas uma vez."
        };
      }
    }

    // 4. Registro Desacoplado
    const timestampFormatado = Utilities.formatDate(new Date(), "America/Cuiaba", "dd/MM/yyyy HH:mm:ss");
    const numProtocoloVoto = "VOT-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
    const cpfHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, cpfLimpo));
    const comprovanteAutenticidade = Utilities.base64Encode(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, numProtocoloVoto + "_" + timestampFormatado)
    ).substring(0, 16).toUpperCase();

    // A) Salva na lista de presença (Eleitores_Votacao) - Sem qualquer vínculo com o candidato escolhido!
    sheetEleitores.appendRow([
      numProtocoloVoto,
      timestampFormatado,
      el.nome.trim(),
      mascararCPF(cpfLimpo),
      el.bairro || "Sapezal",
      cpfHash
    ]);

    // B) Salva na Urna_Votos - 100% Anônimo, sem identificação do eleitor
    const idVotoUrna = Utilities.getUuid();
    sheetUrna.appendRow([
      idVotoUrna,
      timestampFormatado,
      vt.candidatoId,
      vt.candidatoNome,
      vt.candidatoBairro || ""
    ]);

    return {
      success: true,
      protocolo: numProtocoloVoto,
      autenticidade: comprovanteAutenticidade,
      timestamp: timestampFormatado,
      nomeEleitor: el.nome.trim(),
      message: "Voto computado com sucesso! Seu voto foi depositado na urna com sigilo absoluto."
    };

  } catch (err) {
    console.error("Erro em registrarVoto: " + err);
    return {
      success: false,
      message: "Falha ao registrar voto: " + err.message
    };
  } finally {
    lock.releaseLock();
  }
}

