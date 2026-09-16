# Arquitetura dos Mapas Urbanos
## Portal do Plano Diretor Municipal de Sapezal

### Objetivo

Este documento define a arquitetura funcional do módulo **Mapas Urbanos**, sua relação com a base de dados da planilha principal e a estratégia de evolução futura do sistema.

O objetivo é permitir que o módulo evolua de um simples visualizador de zoneamento para uma plataforma de:

- Consulta Urbanística;
- Comparação de Cenários do Plano Diretor;
- Análise Territorial;
- Participação Social;
- Transparência e apoio à tomada de decisão.

---

# Princípios Arquiteturais

## 1. Um único mapa

Todo o sistema deverá utilizar um único mapa principal.

Não serão criadas páginas independentes para:

- Consulta Urbanística;
- Comparador da Revisão;
- Análise Territorial.

Essas funcionalidades deverão funcionar como modos de visualização dentro do mesmo mapa.

---

## 2. Separação entre dados e visualização

Os GeoJSONs não devem armazenar informações de estilo.

GeoJSON:

- Geometria;
- Identificador;
- Nome;
- Zona;
- Informações mínimas.

Código:

- Cor;
- Opacidade;
- Espessura de contorno;
- Legendas;
- Comportamentos.

---

## 3. Geografia não é legislação

O GeoJSON informa:

> Onde está uma zona.

A planilha informa:

> O que aquela zona significa.

---

# Estrutura Geral da Solução

## Portal Plano Diretor

```text
Portal Plano Diretor
│
├─ Início
├─ Participação Social
├─ Mapas Urbanos
├─ Agenda
├─ Vídeos
├─ Plano Anterior
└─ FAQ
```

Mapas Urbanos permanece como uma única aba do portal.

---

# Modos de Visualização

O módulo deverá suportar três modos:

## Consulta Urbanística

Destinado a:

- cidadãos;
- arquitetos;
- engenheiros;
- investidores;
- corretores.

Pergunta respondida:

```text
O que posso fazer aqui?
```

---

## Comparador da Revisão

Destinado a:

- participação social;
- audiências públicas;
- Conselho da Cidade;
- Câmara Municipal.

Pergunta respondida:

```text
O que muda nesta área?
```

---

## Análise Territorial

Destinado a:

- planejamento urbano;
- gestão municipal;
- equipes técnicas.

Pergunta respondida:

```text
Como a cidade está evoluindo?
```

---

# Fontes de Dados

O sistema utilizará dois grupos de dados:

## 1. Dados Geográficos

Arquivos GeoJSON.

Exemplos:

```text
Zoneamento Proposto

Zoneamento Vigente

Bairros

Perímetro Urbano

Vazios Urbanos

Evolução Urbana

Áreas Públicas

APP

Equipamentos Públicos
```

---

## 2. Dados Descritivos

Planilha principal do Portal.

Exemplos:

```text
Parâmetros Urbanísticos

Usos Permitidos

Legislação

Glossário

Mensagens para Cidadãos

Indicadores
```

---

# Estrutura da Planilha

A planilha é a principal base de dados do Portal do Plano Diretor.

Existem dois grupos de abas.

---

## Grupo 1
### Abas Institucionais

Responsáveis pela alimentação do portal principal.

```text
EVENTOS

ETAPAS

DOCUMENTOS

VIDEOS

FAQ
```

Essas abas já existem e continuam alimentando:

- agenda;
- participação social;
- cronograma;
- documentos;
- vídeos.

---

## Grupo 2
### Abas do Módulo Mapas Urbanos

```text
PARAMETROS_ZONAS

USOS_ZONA

LEGISLACAO_ZONA

CENARIOS

CAMADAS

ESTILO_CAMADAS

BAIRROS

INDICADORES_TERRITORIAIS

GLOSSARIO

MENSAGENS_CIDADAO

RELACAO_ZONA_DOCUMENTOS
```

---

# Relação entre GeoJSON e Planilha

## Fluxo

```text
Usuário clica em um polígono
            ↓
Sistema identifica a zona
            ↓
Lê a planilha
            ↓
Monta o painel cidadão
```

---

## Exemplo

GeoJSON:

```json
{
  "zona": "ZRII"
}
```

Sistema consulta:

```text
PARAMETROS_ZONAS

USOS_ZONA

LEGISLACAO_ZONA

MENSAGENS_CIDADAO
```

Resultado:

```text
Zona Residencial II

O que pode fazer aqui

Usos permitidos

Usos proibidos

Parâmetros urbanísticos

Legislação aplicável
```

---

# Integração com Cenários

O sistema deverá ser preparado para suportar dois cenários:

```text
Vigente

Proposto
```

Mesmo que atualmente apenas o cenário proposto exista.

---

## Estrutura

```text
CENARIOS
```

Exemplo:

```text
vigente

proposto
```

---

## Aplicação futura

```text
Zoneamento Vigente
+
Zoneamento Proposto
+
Parâmetros Vigentes
+
Parâmetros Propostos
```

permitirão o funcionamento do:

```text
Comparador da Revisão
```

---

# Organização das Camadas

As camadas não devem ser apresentadas como uma única lista.

Devem ser agrupadas.

---

## Planejamento Urbano

```text
Zoneamento Proposto

Zoneamento Vigente

Bairros

Perímetro Urbano
```

---

## Estrutura Urbana

```text
Sistema Viário

Equipamentos Públicos

Áreas Públicas

Áreas Institucionais
```

---

## Evolução Territorial

```text
Vazios Urbanos

Evolução Urbana

Áreas Não Utilizadas

Expansão Urbana
```

---

## Meio Ambiente

```text
APP

Áreas Verdes

Preservação Ambiental
```

---

# Painel de Consulta Urbanística

Ao clicar em uma área o sistema deverá exibir:

```text
Zona

Descrição Simplificada

Usos Permitidos

Usos Não Permitidos

Parâmetros Urbanísticos

Bairro

Legislação Aplicável
```

---

# Prioridade de Linguagem

Sempre exibir primeiro:

```text
Linguagem cidadã
```

Exemplo:

```text
O que você pode fazer aqui?
```

e somente depois:

```text
Taxa de Ocupação

Coeficiente de Aproveitamento

Taxa de Permeabilidade
```

---

# Modo Comparador

Quando existir cenário vigente.

O painel deverá apresentar:

```text
Situação Atual

Situação Proposta

Diferenças
```

Exemplo:

```text
ZRII → ZM

TO:
70% → 80%

CA:
2 → 3

Altura:
4 → 8 pavimentos
```

---

# Modo Análise Territorial

Permitirá visualizar:

```text
Vazios Urbanos

Expansão Urbana

Áreas Públicas

Evolução Urbana

Indicadores
```

sem interferir na experiência da Consulta Urbanística.

---

# Estratégia de Crescimento

As futuras camadas deverão ser adicionadas apenas através da:

```text
CAMADAS
```

sem necessidade de alterar a arquitetura principal do sistema.

O objetivo é que novas camadas geográficas possam ser incorporadas sem refatorações significativas no código.