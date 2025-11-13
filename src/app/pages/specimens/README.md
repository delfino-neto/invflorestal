# Módulo de Espécimes - Frontend

## 📋 Visão Geral

Módulo completo para gerenciamento de espécimes no sistema de inventário florestal, utilizando **PrimeNG DataView** para uma experiência visual elegante e intuitiva.

## 🎨 Componentes Criados

### 1. **SpecimenListComponent** (Listagem)
- **Localização**: `/app/pages/specimens/specimen-list.component.ts`
- **Características**:
  - ✅ Utiliza `p-dataView` do PrimeNG
  - ✅ **Duas visualizações**: Grade (cards) e Lista
  - ✅ Busca em tempo real com debounce
  - ✅ Paginação com opções de 12, 24 ou 36 itens por página
  - ✅ Cards elegantes com informações completas:
    - Nome científico e comum da espécie
    - Código da parcela
    - Localização GPS (latitude/longitude)
    - Observador com avatar
    - Data de registro
  - ✅ Ações: Visualizar, Editar, Excluir
  - ✅ Confirmação de exclusão com dialog
  - ✅ Estados: loading, empty state com ilustração
  - ✅ Design responsivo com animações suaves

### 2. **SpecimenFormComponent** (Formulário)
- **Localização**: `/app/pages/specimens/specimen-form.component.ts`
- **Características**:
  - ✅ Formulário reativo com validação
  - ✅ Suporta criação e edição
  - ✅ Dropdowns com busca para:
    - Espécies
    - Parcelas
    - Observadores
  - ✅ Campos de coordenadas GPS com validação de range
  - ✅ Feedback visual de erros
  - ✅ Loading states nos dropdowns

### 3. **SpecimenDetailComponent** (Detalhes)
- **Localização**: `/app/pages/specimens/specimen-detail.component.ts`
- **Características**:
  - ✅ Visualização completa dos dados do espécime
  - ✅ Sistema de abas (Tabs) para:
    - Histórico de medições (preparado para API)
    - Localização no mapa (futuro)
    - Galeria de fotos (futuro)
  - ✅ Cópia rápida de coordenadas
  - ✅ Navegação para edição
  - ✅ Design card-based elegante

## 🎨 Design e UX

### Layout da Listagem em Grade
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Card 1    │   Card 2    │   Card 3    │   Card 4    │
│  Espécime   │  Espécime   │  Espécime   │  Espécime   │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Características Visuais
- 🎨 Gradientes sutis no header
- 🌈 Tags coloridas para status
- 👤 Avatars com iniciais do observador
- 📍 Ícones contextuais (folha, mapa, usuário)
- ⚡ Animações de hover e transições suaves
- 🌓 Suporte completo a dark mode
- 📱 Totalmente responsivo

## 🛣️ Rotas Configuradas

```typescript
/specimens              → Listagem
/specimens/new          → Novo espécime
/specimens/edit/:id     → Editar espécime
/specimens/view/:id     → Detalhes do espécime
```

## 📂 Estrutura de Arquivos

```
src/app/pages/specimens/
├── specimen-list.component.ts        # Listagem com DataView
├── specimen-list.component.html      # Template da listagem
├── specimen-list.component.scss      # Estilos da listagem
├── specimen-form.component.ts        # Formulário
├── specimen-form.component.html      # Template do formulário
├── specimen-form.component.scss      # Estilos do formulário
├── specimen-detail.component.ts      # Detalhes
├── specimen-detail.component.html    # Template de detalhes
├── specimen-detail.component.scss    # Estilos de detalhes
└── specimen.routes.ts                # Configuração de rotas
```

## 🔧 Integrações

### Services Utilizados
- ✅ `SpecimenObjectService` - CRUD de espécimes
- ✅ `SpeciesTaxonomyService` - Listagem de espécies
- ✅ `PlotService` - Listagem de parcelas
- ✅ `UserService` - Listagem de observadores

### APIs Backend
- `GET /api/specimen-objects?page=0&size=12` - Listagem paginada
- `POST /api/specimen-objects` - Criar espécime
- `GET /api/specimen-objects/{id}` - Buscar por ID
- `PUT /api/specimen-objects/{id}` - Atualizar
- `DELETE /api/specimen-objects/{id}` - Excluir

## 🎯 Próximas Implementações

### Histórico de Medições
O componente de detalhes já está preparado para exibir o histórico de medições usando a nova API de `SpeciesInfo`:

```typescript
// TODO: Implementar integração com SpeciesInfo API
GET /api/species-info/specimen/{specimenId}/history
```

### Funcionalidades Futuras
- [ ] Mapa interativo mostrando localização do espécime
- [ ] Galeria de fotos do espécime
- [ ] Filtros avançados na listagem
- [ ] Exportação de dados (CSV, PDF)
- [ ] QR Code para cada espécime
- [ ] Gráficos de crescimento (usando histórico)

## 📱 Responsividade

### Breakpoints
- **Mobile** (< 768px): 1 coluna
- **Tablet** (768px - 1024px): 2 colunas
- **Desktop** (1024px - 1440px): 3 colunas
- **Large Desktop** (> 1440px): 4 colunas

## 🎨 Componentes PrimeNG Utilizados

- `DataView` - Listagem principal
- `Card` - Cards de informação
- `Button` - Botões de ação
- `Select` - Dropdowns
- `InputNumber` - Campos numéricos
- `Tag` - Tags de status
- `Chip` - Chips informativos
- `Avatar` - Avatars de usuário
- `Toast` - Notificações
- `ConfirmDialog` - Confirmações
- `Tabs` - Abas de navegação
- `Timeline` - Linha do tempo (futuro)
- `Skeleton` - Loading states

## 🚀 Como Usar

### Acessar a Listagem
1. Faça login no sistema
2. No menu lateral, vá em **Inventário** → **Espécimes**
3. Visualize os espécimes cadastrados

### Cadastrar Novo Espécime
1. Clique no botão **"Novo Espécime"**
2. Preencha os campos obrigatórios:
   - Espécie
   - Parcela
   - Coordenadas GPS (latitude/longitude)
   - Observador
3. Clique em **"Cadastrar"**

### Visualizar Detalhes
1. Na listagem, clique no botão **"Visualizar"** de um espécime
2. Navegue pelas abas para ver diferentes informações
3. Clique em **"Copiar"** para copiar as coordenadas GPS

### Editar Espécime
1. Clique no botão **"Editar"** (ícone de lápis)
2. Modifique os campos desejados
3. Clique em **"Atualizar"**

## 💡 Dicas de Uso

- **Busca**: Digite qualquer parte do nome da espécie, código da parcela ou nome do observador
- **Visualização**: Alterne entre grade e lista conforme sua preferência
- **Coordenadas**: Use o botão de copiar para facilitar o uso em mapas externos
- **Paginação**: Ajuste o número de itens por página conforme necessário

## 🐛 Troubleshooting

### Dropdowns vazios no formulário
- Verifique se as APIs de espécies, parcelas e usuários estão funcionando
- Veja o console do navegador para mensagens de erro

### Cards não aparecem
- Verifique se há dados cadastrados
- Confira a conexão com a API backend
- Veja as mensagens de toast para erros

---

**Desenvolvido com ❤️ usando Angular 18 + PrimeNG**
