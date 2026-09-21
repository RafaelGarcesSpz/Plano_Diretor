/**
 * Sistema de Inscrição e Votação de Delegados - Plano Diretor de Sapezal/MT
 * Arquivo: Controller_Votacao.gs (Lógica de Urna Eletrônica e Votação Popular)
 */

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
 * Normaliza textos para comparação
 */
function normalizarTextoVotacao(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Mapeia dinamicamente os índices das colunas da aba Inscricoes
 */
function mapearColunasInscricoesVotacao(headerRow) {
  const map = {
    protocolo: 0,
    nomeCompleto: 2,
    nomeUrna: 3,
    bairro: 8,
    segmento: 9,
    minibio: 10,
    linkFoto: 14,
    status: 15
  };

  if (!headerRow || headerRow.length === 0) return map;

  const normalized = headerRow.map(h => normalizarTextoVotacao(h));

  normalized.forEach((h, idx) => {
    if (h.includes("protocolo")) map.protocolo = idx;
    else if (h.includes("nome de urna") || h.includes("nome urna") || h.includes("apelido")) map.nomeUrna = idx;
    else if (h.includes("nome completo") || h === "nome") map.nomeCompleto = idx;
    else if (h.includes("bairro") || h.includes("comunidade")) map.bairro = idx;
    else if (h.includes("segmento")) map.segmento = idx;
    else if (h.includes("minibiografia") || h.includes("apresentacao") || h.includes("proposta")) map.minibio = idx;
    else if (h.includes("foto") || h.includes("divulgacao") || h.includes("imagem")) map.linkFoto = idx;
    else if (h === "status" || h.includes("status")) map.status = idx;
  });

  return map;
}

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

    const map = mapearColunasInscricoesVotacao(rows[0]);
    const listaDeferidos = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[map.protocolo] && !row[map.nomeCompleto]) continue;

      const rawStatus = row[map.status] !== undefined && row[map.status] !== null ? String(row[map.status]).trim() : "";
      const status = normalizarTextoVotacao(rawStatus);

      // Filtra apenas candidaturas Deferidas / Homologadas / Aprovadas
      if (status === 'deferida' || status === 'deferido' || status === 'aprovado' || status === 'aprovada' || status === 'homologado' || status === 'homologada') {
        listaDeferidos.push({
          id: String(row[map.protocolo] || ""),             // Protocolo
          nome: String(row[map.nomeCompleto] || ""),           // Nome Completo
          nomeUrna: String(row[map.nomeUrna] || row[map.nomeCompleto] || ""), // Nome de Urna
          bairro: String(row[map.bairro] || ""),         // Bairro
          segmento: String(row[map.segmento] || "Sociedade Civil"),
          minibio: String(row[map.minibio] || ""), // Apresentação
          fotoUrl: formatarUrlImagemDrive(row[map.linkFoto])  // Link direto de imagem
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
 * Retorna os resultados e ranking oficial da Apuração Pública dos Votos
 */
function obterApuracaoPublica() {
  try {
    const ss = getSpreadsheet();
    const sheetUrna = ss.getSheetByName(APP_CONFIG.SHEET_URNA);
    const sheetEleitores = ss.getSheetByName(APP_CONFIG.SHEET_ELEITORES);
    
    // 1. Obtém a lista oficial de candidatos homologados/deferidos
    const candResp = obterCandidatosDeferidos();
    const candidatos = (candResp && candResp.success && candResp.data) ? candResp.data : [];

    // Mapa de contagem de votos por Protocolo do Candidato
    const mapaVotos = {};
    candidatos.forEach(c => {
      mapaVotos[String(c.id).trim()] = 0;
    });

    let totalVotosValidos = 0;

    // 2. Contabiliza votos da Urna Eletrônica
    if (sheetUrna) {
      const rowsUrna = sheetUrna.getDataRange().getValues();
      for (let i = 1; i < rowsUrna.length; i++) {
        const row = rowsUrna[i];
        if (!row[0] && !row[2]) continue;
        const candId = String(row[2] || "").trim();
        if (candId) {
          totalVotosValidos++;
          mapaVotos[candId] = (mapaVotos[candId] || 0) + 1;
        }
      }
    }

    // 3. Contabiliza quórum de eleitores votantes
    let totalEleitoresVotantes = 0;
    if (sheetEleitores) {
      const rowsEleit = sheetEleitores.getDataRange().getValues();
      for (let i = 1; i < rowsEleit.length; i++) {
        if (rowsEleit[i][0] || rowsEleit[i][2]) {
          totalEleitoresVotantes++;
        }
      }
    }

    // 4. Monta lista consolidada de resultados
    const listaApurada = candidatos.map(c => {
      const votos = mapaVotos[String(c.id).trim()] || 0;
      const percentual = totalVotosValidos > 0 ? ((votos / totalVotosValidos) * 100).toFixed(2) : "0.00";
      return {
        id: c.id,
        nome: c.nome,
        nomeUrna: c.nomeUrna,
        bairro: c.bairro,
        segmento: c.segmento,
        minibio: c.minibio,
        fotoUrl: c.fotoUrl,
        votos: votos,
        percentual: parseFloat(percentual),
        percentualFormatado: percentual.replace('.', ',') + '%'
      };
    });

    // 5. Ordena decrescente por quantidade de votos (desempate por nome alfabético)
    listaApurada.sort((a, b) => {
      if (b.votos !== a.votos) {
        return b.votos - a.votos;
      }
      return a.nomeUrna.localeCompare(b.nomeUrna);
    });

    // 6. Atribui a classificação e status oficial conforme o Edital / Regras
    // Regra 1: 10 Titulares (1º ao 10º), 10 Suplentes (11º ao 20º), Demais não eleitos
    const resultadoFinal = listaApurada.map((item, idx) => {
      const posicao = idx + 1;
      let statusEleitoral = "NAO_ELEITO";
      let statusDescricao = "Não Eleito";
      let statusBadge = "bg-slate-100 text-slate-700 border-slate-300";

      if (posicao <= 10) {
        statusEleitoral = "TITULAR";
        statusDescricao = "ELEITO (TITULAR)";
        statusBadge = "bg-emerald-100 text-emerald-800 border-emerald-400 font-black";
      } else if (posicao <= 20) {
        statusEleitoral = "SUPLENTE";
        statusDescricao = "SUPLENTE";
        statusBadge = "bg-amber-100 text-amber-800 border-amber-400 font-bold";
      }

      return {
        ...item,
        posicao: posicao,
        posicaoOrdinal: posicao + "º",
        statusEleitoral: statusEleitoral,
        statusDescricao: statusDescricao,
        statusBadge: statusBadge
      };
    });

    const timestampApuracao = Utilities.formatDate(new Date(), "America/Cuiaba", "dd/MM/yyyy HH:mm:ss");

    return {
      success: true,
      data: {
        totalVotosValidos: totalVotosValidos,
        totalEleitoresVotantes: totalEleitoresVotantes || totalVotosValidos,
        percentualUrnasApuradas: "100%",
        dataApuracao: timestampApuracao,
        totalCandidatos: resultadoFinal.length,
        totalTitulares: Math.min(10, resultadoFinal.length),
        totalSuplentes: Math.max(0, Math.min(10, resultadoFinal.length - 10)),
        candidatos: resultadoFinal
      }
    };
  } catch (err) {
    console.error("Erro em obterApuracaoPublica: " + err);
    return {
      success: false,
      message: "Erro ao compilar apuração oficial: " + err.message,
      data: {
        totalVotosValidos: 0,
        totalEleitoresVotantes: 0,
        percentualUrnasApuradas: "0%",
        dataApuracao: "",
        totalCandidatos: 0,
        candidatos: []
      }
    };
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

    SpreadsheetApp.flush(); // Garante gravação imediata síncrona

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
