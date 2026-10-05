/**
 * SISTEMA WEB INSTITUCIONAL - PLANO DIRETOR MUNICIPAL (VERSÃO EVOLUÍDA)
 * Backend Google Apps Script
 */

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Plano Diretor Municipal - Participação e Transparência')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Retorna o banco de dados unificado para a SPA
 */
function getDatabaseDataLegado() {
  try {
    return {
      status: 'success',
      data: {
        // Etapas da Revisão (Movidas para a Home)
        // Trecho atualizado dentro do getDatabaseData() no Code.gs
      etapas: [
        {
          id: 1,
          titulo: 'ETAPA 1 - Mobilização e Capacitação',
          subtitulo: 'Sensibilização da sociedade e planejamento das atividades participativas.',
          ativa: false,
          atividades: [
            'Criação do Núcleo Gestor', 'Elaboração e Aprovação do Plano de Trabalho','Coleta de Dados e elaboração de diagnósticos preliminares'
      ],
          eventos: [ /* ... */ ],
          produtos: [ /* ... */ ]
        },
        {
          id: 2,
          titulo: 'ETAPA 2 - Leitura da Cidade',
          subtitulo: 'Diagnóstico técnico e participativo sobre a realidade municipal.',
          ativa: true, // ETAPA ATUAL EM ANDAMENTO
          atividades: [ /* ... */ ],
          eventos: [ 'Reunião Técnica Preparatória 04/04/2025' ],
          produtos: [ /* ... */ ]
        },
        {
          id: 3,
          titulo: 'ETAPA 3 - Consolidação da Proposta',
          subtitulo: 'Formulação de diretrizes, objetivos e propostas de estruturação territorial.',
          ativa: false,
          atividades: [ /* ... */ ],
          eventos: [ /* ... */ ],
          produtos: [ /* ... */ ]
        },
        {
          id: 4,
          titulo: 'ETAPA 4 - Validação e Minutas de Leis',
          subtitulo: 'Redação dos instrumentos jurídicos e aprovação final.',
          ativa: false,
          atividades: [ 'testando', 'teste dois' ],
          eventos: [ /* ... */ ],
          produtos: [ /* ... */ ]
        }
      ],

        // Eventos Exclusivos da Agenda / Calendário
        eventos: [
          {
            id: 1,
            title: 'Audiência Pública de Lançamento',
            start: '2027-01-15T19:00:00',
            end: '2027-01-15T21:00:00',
            status: 'Realizado',
            tipo: 'Audiência Pública',
            location: 'Câmara Municipal de Sapezal',
            description: 'Apresentação pública da metodologia, equipe e cronograma geral do Plano Diretor.'
          },
          {
            id: 2,
            title: 'Oficina Participativa - Bairro Centro',
            start: '2027-03-10T18:30:00',
            end: '2027-03-10T21:00:00',
            status: 'Em andamento',
            tipo: 'Oficina Participativa',
            location: 'Escola Municipal Central',
            description: 'Levantamento de problemas e sugestões prioritárias com os moradores da zona central.'
          },
          {
            id: 3,
            title: 'Reunião Técnica - Grupo de Acompanhamento',
            start: '2027-04-05T14:00:00',
            end: '2027-04-05T16:00:00',
            status: 'Agendado',
            tipo: 'Reunião Técnica',
            location: 'Prefeitura Municipal - Sala de Reuniões',
            description: 'Validação parcial dos dados do diagnóstico com técnicos municipais.'
          },
          {
            id: 4,
            title: 'Consulta Pública On-line sobre Mobilidade',
            start: '2027-05-01T08:00:00',
            end: '2027-05-31T23:59:00',
            status: 'Agendado',
            tipo: 'Consulta Pública',
            location: 'Portal Web / Formulario Digital',
            description: 'Coleta de contribuições do público sobre transporte e sistema viário.'
          }
        ],

        // FAQ
        faq: [
          {
            pergunta: 'O que é o Plano Diretor Municipal?',
            resposta: 'O Plano Diretor é a lei municipal que orienta o crescimento e o desenvolvimento da cidade. Ele define regras para o uso do solo, transportes, habitação, meio ambiente e serviços públicos.'
          },
          {
            pergunta: 'Por que o Plano Diretor precisa ser revisado?',
            resposta: 'Conforme o Estatuto da Cidade (Lei Federal nº 10.257/2001), o Plano Diretor deve ser revisto pelo menos a cada 10 anos para se adequar às novas necessidades da população.'
          },
          {
            pergunta: 'Como posso participar das decisões?',
            resposta: 'Você pode participar de três formas: presencialmente nas audiências públicas e oficinas do seu bairro; através do formulário na aba "Participação Popular"; ou acompanhando as transmissões ao vivo.'
          },
          {
            pergunta: 'As propostas enviadas pela população são realmente analisadas?',
            resposta: 'Sim. Todas as contribuições são registradas, sistematizadas pela equipe técnica responsável e consolidadas no relatório final do Plano Diretor.'
          }
        ],

        // Demais coleções preservadas
        mapas: [
          { id: 1, titulo: 'Mapa de Macrozoneamento Urbano', categoria: 'Zoneamento', data: '2027-01-10', pdfUrl: '#', imgUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&auto=format&fit=crop&q=80', descricao: 'Divisão de áreas urbanas, rurais e de preservação.' },
          { id: 2, titulo: 'Mapa do Sistema Viário e Mobilidade', categoria: 'Transporte', data: '2027-02-14', pdfUrl: '#', imgUrl: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=600&auto=format&fit=crop&q=80', descricao: 'Malha viária principal, ciclovias e eixos de transporte coletivo.' }
        ],
        participacao: {
          totalContribuissoes: 0,
          audienciaProxima: '',
          ultimas: []
        },
        videos: [
          { id: 1, titulo: 'Vídeo Explicativo: O que é o Plano Diretor?', data: '2027-01-10', youtubeId: 'dQw4w9WgXcQ', descricao: 'Aprenda como o Plano Diretor impacta a sua vida cotidiana.' }
        ],
        planoAnterior: {
          resumo: 'Acesso às leis, mapas e diagnósticos do Plano Diretor anterior em vigor.',
          documentos: [
            { titulo: 'Lei Complementar do Plano Diretor (Texto Integral)', tipo: 'PDF', tamanho: '5.1 MB', url: '#' },
            { titulo: 'Mapa de Zoneamento Urbano Vigente', tipo: 'PDF', tamanho: '9.3 MB', url: '#' }
          ]
        }
      }
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Busca o arquivo GeoJSON no Google Drive por ID ou Nome.
 */
function getDatabaseData() {
  try {

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const etapas = getEtapasFromSheet(ss);
    const atividades = getAtividadesFromSheet(ss);
    const eventos = getEventosFromSheet(ss);
    const produtos = getProdutosFromSheet(ss);
    const faq = getFaqFromSheet(ss);
    const dadosParticipacao = getContribuicoesFromSheet(ss);

    // Identifica dinamicamente a próxima oportunidade presencial a partir da agenda de eventos
    let proximaAudiencia = '';
    if (eventos && eventos.length > 0) {
      const nowStr = new Date().toISOString().substring(0, 10);
      const eventoFuturo = eventos.find(e => e.start && e.start >= nowStr) || eventos[0];
      if (eventoFuturo && eventoFuturo.title) {
        proximaAudiencia = formatarDataBR(eventoFuturo.start) + ' - ' + eventoFuturo.title + (eventoFuturo.location ? ' (' + eventoFuturo.location + ')' : '');
      }
    }

    const etapasCompletas = etapas.map(etapa => ({

      ...etapa,

      atividades: atividades
        .filter(a => a.etapa_id == etapa.id)
        .map(a => a.descricao),

      eventos: eventos
        .filter(e => e.etapa_id == etapa.id)
        .map(e => ({
          titulo: e.title,
          local: e.location,
          data: formatarDataBR(e.start)
        })),

      produtos: produtos
        .filter(p => p.etapa_id == etapa.id)
        .map(p => ({
          titulo: p.titulo,
          url: p.url
        }))
    }));


    return {
      status: 'success',
      data: {
        etapas: etapasCompletas,
        eventos: eventos,
        faq: faq,

        mapas: [
          {
            id: 1,
            titulo: 'Mapa de Macrozoneamento Urbano',
            categoria: 'Zoneamento',
            data: '2027-01-10',
            pdfUrl: '#',
            imgUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&auto=format&fit=crop&q=80',
            descricao: 'Divisão de áreas urbanas, rurais e de preservação.'
          },
          {
            id: 2,
            titulo: 'Mapa do Sistema Viário e Mobilidade',
            categoria: 'Transporte',
            data: '2027-02-14',
            pdfUrl: '#',
            imgUrl: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=600&auto=format&fit=crop&q=80',
            descricao: 'Malha viária principal, ciclovias e eixos de transporte coletivo.'
          }
        ],

        participacao: {
          totalContribuissoes: dadosParticipacao.total,
          audienciaProxima: proximaAudiencia,
          ultimas: dadosParticipacao.ultimas
        },

        videos: [
          {
            id: 1,
            titulo: 'Vídeo Explicativo: O que é o Plano Diretor?',
            data: '2027-01-10',
            youtubeId: 'dQw4w9WgXcQ',
            descricao: 'Aprenda como o Plano Diretor impacta a sua vida cotidiana.'
          }
        ],

        planoAnterior: {
          resumo: 'Acesso às leis, mapas e diagnósticos do Plano Diretor anterior em vigor.',
          documentos: [
            {
              titulo: 'Lei Complementar do Plano Diretor (Texto Integral)',
              tipo: 'PDF',
              tamanho: '5.1 MB',
              url: '#'
            },
            {
              titulo: 'Mapa de Zoneamento Urbano Vigente',
              tipo: 'PDF',
              tamanho: '9.3 MB',
              url: '#'
            }
          ]
        }
      }
    };

  } catch (err) {

    return {
      status: 'error',
      message: err.toString()
    };

  }
}

function getGeoJsonData(fileIdOrName) {
  try {
    let file;
    
    if (fileIdOrName.length > 20 && !fileIdOrName.includes('.')) {
      file = DriveApp.getFileById(fileIdOrName);
    } else {
      const fileName = fileIdOrName.endsWith('.geojson') ? fileIdOrName : fileIdOrName + '.geojson';
      const files = DriveApp.getFilesByName(fileName);
      if (files.hasNext()) {
        file = files.next();
      } else {
        return { success: false, error: `Arquivo '${fileName}' não encontrado no Google Drive.` };
      }
    }
    
    const content = file.getBlob().getDataAsString('UTF-8');
    const jsonContent = JSON.parse(content);
    
    return {
      success: true,
      data: jsonContent,
      filename: file.getName(),
      lastModified: file.getLastUpdated().toISOString()
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: 'Erro ao processar arquivo GeoJSON: ' + error.toString() 
    };
  }
}
/**
 * Retorna as camadas disponíveis no sistema.
 * DICA: Substitua o 'id' pelo ID real de cada arquivo no seu Google Drive.
 */
function getCamadasDisponiveis() {
  return [
    { id: '1oud92GigcCUYgD09eFMes2i6NeL_tWHy', nome: 'Zoneamento Municipal', arquivo: 'zoneamentov1.geojson', ativoPadrao: true },
    { id: 'SEU_ID_AQUI', nome: 'Hidrografia e APPs', arquivo: 'hidrografia.geojson', ativoPadrao: false },
    { id: 'SEU_ID_AQUI', nome: 'Sistema Viário', arquivo: 'sistema_viario.geojson', ativoPadrao: false },
    { id: 'SEU_ID_AQUI', nome: 'Equipamentos Públicos', arquivo: 'equipamentos.geojson', ativoPadrao: false },
    { id: 'SEU_ID_AQUI', nome: 'Uso do Solo', arquivo: 'uso_solo.geojson', ativoPadrao: false },
    { id: 'SEU_ID_AQUI', nome: 'Áreas Ambientais', arquivo: 'areas_ambientais.geojson', ativoPadrao: false }
    
  ];
}


// testes//

function diagnosticoCompleto() {

  Logger.log('========== INÍCIO DIAGNÓSTICO ==========');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Logger.log('Planilha encontrada? %s', !!ss);

  if (!ss) {
    Logger.log('ERRO: ActiveSpreadsheet retornou null');
    return;
  }

  Logger.log('Nome da planilha: %s', ss.getName());
  Logger.log('ID da planilha: %s', ss.getId());

  const abas = ss.getSheets().map(s => s.getName());

  Logger.log('Abas encontradas:');
  abas.forEach(nome => Logger.log(' - %s', nome));

  const etapaSheet = ss.getSheetByName('Etapas');
  const eventoSheet = ss.getSheetByName('Eventos');
  const faqSheet = ss.getSheetByName('FAQ');

  Logger.log('Aba Etapas existe? %s', !!etapaSheet);
  Logger.log('Aba Eventos existe? %s', !!eventoSheet);
  Logger.log('Aba FAQ existe? %s', !!faqSheet);

  if (etapaSheet) {
    Logger.log('Linhas Etapas: %s', etapaSheet.getLastRow());
    Logger.log('Colunas Etapas: %s', etapaSheet.getLastColumn());

    const dados = etapaSheet.getDataRange().getValues();

    Logger.log('Primeiras linhas da aba Etapas:');
    Logger.log(JSON.stringify(dados.slice(0, 3)));
  }

  if (eventoSheet) {
    Logger.log('Linhas Eventos: %s', eventoSheet.getLastRow());

    const dados = eventoSheet.getDataRange().getValues();

    Logger.log('Primeiras linhas da aba Eventos:');
    Logger.log(JSON.stringify(dados.slice(0, 3)));
  }

  if (faqSheet) {
    Logger.log('Linhas FAQ: %s', faqSheet.getLastRow());

    const dados = faqSheet.getDataRange().getValues();

    Logger.log('Primeiras linhas da aba FAQ:');
    Logger.log(JSON.stringify(dados.slice(0, 3)));
  }

  const etapas = getEtapasFromSheet(ss);
  const eventos = getEventosFromSheet(ss);
  const faq = getFaqFromSheet(ss);

  Logger.log('Quantidade de etapas convertidas: %s', etapas.length);
  Logger.log('Quantidade de eventos convertidos: %s', eventos.length);
  Logger.log('Quantidade de FAQ convertidos: %s', faq.length);

  Logger.log('Primeira etapa convertida:');
  Logger.log(JSON.stringify(etapas[0], null, 2));

  Logger.log('Primeiro evento convertido:');
  Logger.log(JSON.stringify(eventos[0], null, 2));

  Logger.log('Primeiro FAQ convertido:');
  Logger.log(JSON.stringify(faq[0], null, 2));

  Logger.log('========== FIM DIAGNÓSTICO ==========');
}

function testarEtapasCompletas() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const etapas = getEtapasFromSheet(ss);
  const atividades = getAtividadesFromSheet(ss);
  const eventos = getEventosFromSheet(ss);
  const produtos = getProdutosFromSheet(ss);

  const etapasCompletas = etapas.map(etapa => ({

    ...etapa,

    atividades: atividades
      .filter(a => a.etapa_id == etapa.id)
      .map(a => a.descricao),

    eventos: eventos
      .filter(e => e.etapa_id == etapa.id)
      .map(e => ({
        titulo: e.title,
        local: e.location,
        data: formatarDataBR(e.start)
      })),

    produtos: produtos
      .filter(p => p.etapa_id == etapa.id)
      .map(p => ({
        titulo: p.titulo,
        url: p.url
      }))
  }));

  Logger.log(JSON.stringify(etapasCompletas, null, 2));
}


function getEtapasFromSheet(ss) {

  const sheet = ss.getSheetByName('Etapas');

  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) return [];

  rows.shift();

  return rows.map(row => ({

    id: Number(row[0]),

    titulo: String(row[1] || ''),

    subtitulo: String(row[2] || ''),

    ativa:
      row[3] === true ||
      String(row[3]).toUpperCase() === 'TRUE'

  }));

}

function getAtividadesFromSheet(ss) {

  const sheet = ss.getSheetByName('Atividades');

  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) return [];

  rows.shift();

  return rows.map(row => ({

    id: Number(row[0]),

    etapa_id: Number(row[1]),

    descricao: String(row[2] || '')

  }));

}

function getEventosFromSheet(ss) {

  const sheet = ss.getSheetByName('Eventos');

  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) return [];

  rows.shift();

  return rows.map(row => ({

    id: Number(row[0]),

    etapa_id: Number(row[1]),

    title: String(row[2] || ''),

    start:
      row[3] instanceof Date
        ? row[3].toISOString()
        : String(row[3] || ''),

    end:
      row[4] instanceof Date
        ? row[4].toISOString()
        : String(row[4] || ''),

    status: String(row[5] || ''),

    tipo: String(row[6] || ''),

    location: String(row[7] || ''),

    description: String(row[8] || ''),

    eventoUrl: String(row[9] || '')

  }));

}

function getFaqFromSheet(ss) {
  const sheet = ss.getSheetByName('FAQ');
  if (!sheet) return [];
  
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  rows.shift();
  
  return rows.map(row => ({
    pergunta: String(row[0] || ''),
    resposta: String(row[1] || '')
  }));
}

function getProdutosFromSheet(ss) {

  const sheet = ss.getSheetByName('Produtos');

  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) return [];

  rows.shift();

  return rows.map(row => ({

    id: Number(row[0]),

    etapa_id: Number(row[1]),

    titulo: String(row[2] || ''),

    url: String(row[3] || '#'),

    tipo: String(row[4] || '')

  }));

}


/**
 * Busca as contribuições registradas na aba "Contribuicoes" da planilha oficial
 */
function getContribuicoesFromSheet(ss) {
  if (!ss) return { total: 0, ultimas: [] };

  let sheet = ss.getSheetByName('Contribuicoes');
  if (!sheet) {
    sheet = ss.getSheetByName('Contribuições');
  }

  // Se a aba não existir, cria automaticamente com cabeçalhos padronizados
  if (!sheet) {
    try {
      sheet = ss.insertSheet('Contribuicoes');
      sheet.appendRow(['ID', 'Data/Hora', 'Nome', 'Bairro', 'E-mail', 'Mensagem', 'Status']);
      sheet.getRange('A1:G1').setFontWeight('bold').setBackground('#015797').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    } catch (e) {
      console.warn('Aviso ao inicializar aba Contribuicoes: ' + e);
      return { total: 0, ultimas: [] };
    }
  }

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return { total: 0, ultimas: [] };
  }

  let tz = 'America/Cuiaba';
  try {
    tz = Session.getScriptTimeZone() || 'America/Cuiaba';
  } catch (e) {}

  const lista = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Ignora linhas totalmente vazias
    if (!row[0] && !row[2] && !row[5]) continue;

    let dataFormatada = '';
    if (row[1] instanceof Date) {
      try {
        dataFormatada = Utilities.formatDate(row[1], tz, 'dd/MM/yyyy HH:mm');
      } catch (e) {
        dataFormatada = String(row[1]);
      }
    } else if (row[1]) {
      dataFormatada = String(row[1]);
    }

    lista.push({
      id: row[0] || i,
      data: dataFormatada,
      nome: String(row[2] || ''),
      bairro: String(row[3] || 'Sapezal/MT'),
      email: String(row[4] || ''),
      mensagem: String(row[5] || ''),
      status: String(row[6] || 'Recebida')
    });
  }

  // Ordena com as mais recentes primeiro e seleciona até 15 para exibição no feed público
  const ultimas = lista.slice().reverse().slice(0, 15);

  return {
    total: lista.length,
    ultimas: ultimas
  };
}

/**
 * Registra uma nova contribuição diretamente na planilha do Plano Diretor
 */
function enviarContribuicao(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!dados || !dados.nome || !dados.mensagem) {
      throw new Error('Preencha os campos obrigatórios (Nome e Contribuição).');
    }

    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      const props = PropertiesService.getScriptProperties();
      const ssId = props.getProperty('SPREADSHEET_ID');
      if (ssId) {
        try {
          ss = SpreadsheetApp.openById(ssId);
        } catch (e) {}
      }
    }

    if (!ss) {
      throw new Error('Planilha do Plano Diretor não localizada.');
    }

    let sheet = ss.getSheetByName('Contribuicoes');
    if (!sheet) {
      sheet = ss.getSheetByName('Contribuições');
    }

    if (!sheet) {
      sheet = ss.insertSheet('Contribuicoes');
      sheet.appendRow(['ID', 'Data/Hora', 'Nome', 'Bairro', 'E-mail', 'Mensagem', 'Status']);
      sheet.getRange('A1:G1').setFontWeight('bold').setBackground('#015797').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    let tz = 'America/Cuiaba';
    try {
      tz = Session.getScriptTimeZone() || 'America/Cuiaba';
    } catch (e) {}

    const timestamp = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm:ss');
    const ano = Utilities.formatDate(new Date(), tz, 'yyyy');
    const proximoIdNum = Math.max(1, sheet.getLastRow());
    const idContribuicao = 'CONTRIB-' + ano + '-' + String(proximoIdNum).padStart(4, '0');

    sheet.appendRow([
      idContribuicao,
      timestamp,
      String(dados.nome).trim(),
      String(dados.bairro || 'Sapezal/MT').trim(),
      String(dados.email || '').trim(),
      String(dados.mensagem).trim(),
      'Recebida'
    ]);

    SpreadsheetApp.flush(); // Garante gravação imediata na planilha

    return {
      status: 'success',
      message: 'Sua contribuição foi registrada com sucesso!',
      id: idContribuicao
    };
  } catch (e) {
    console.error('Erro em enviarContribuicao: ' + e);
    return {
      status: 'error',
      message: 'Erro ao gravar contribuição: ' + e.message
    };
  } finally {
    lock.releaseLock();
  }
}


function formatarDataBR(dataIso) {

  if (!dataIso) return '';

  const data = new Date(dataIso);

  return Utilities.formatDate(
    data,
    Session.getScriptTimeZone(),
    'dd/MM/yyyy'
  );

}
