# Frontend Services Documentation

Este documento descreve todos os services criados no frontend Angular baseados na API Spring Boot.

## Services Criados

### 1. AuthService (`auth.service.ts`)
- **Endpoint Base**: `/api/auth`
- **Funcionalidades**:
  - `login(payload)` - Autenticação do usuário
  - `logout()` - Logout do usuário
  - `register(payload)` - Registro de novo usuário
  - `loadCurrentUser()` - Carrega dados do usuário atual
  - `me()` - Obtém dados do usuário logado
  - Gestão de estado de autenticação com signals

### 2. UserService (`user.service.ts`)
- **Endpoint Base**: `/api/users`
- **Funcionalidades**:
  - `search(page, size)` - Busca usuários com paginação

### 3. SpeciesTaxonomyService (`species-taxonomy.service.ts`)
- **Endpoint Base**: `/api/species-taxonomy`
- **Funcionalidades**:
  - `createSpeciesTaxonomy(request)` - Criar nova taxonomia
  - `getSpeciesTaxonomies(page, size)` - Listar com paginação
  - `getSpeciesTaxonomyById(id)` - Buscar por ID
  - `updateSpeciesTaxonomy(id, request)` - Atualizar taxonomia
  - `deleteSpeciesTaxonomy(id)` - Deletar taxonomia

### 4. CollectionAreaService (`collection-area.service.ts`)
- **Endpoint Base**: `/api/collection-areas`
- **Funcionalidades**:
  - `create(request)` - Criar área de coleta
  - `search(page, size)` - Listar com paginação
  - `findById(id)` - Buscar por ID
  - `update(id, request)` - Atualizar área
  - `delete(id)` - Deletar área

### 5. PlotService (`plot.service.ts`)
- **Endpoint Base**: `/api/plots`
- **Funcionalidades**:
  - `create(request)` - Criar parcela
  - `search(page, size)` - Listar com paginação
  - `findById(id)` - Buscar por ID
  - `update(id, request)` - Atualizar parcela
  - `delete(id)` - Deletar parcela

### 6. SpecimenObjectService (`specimen-object.service.ts`)
- **Endpoint Base**: `/api/specimen-objects`
- **Funcionalidades**:
  - `create(request)` - Criar objeto espécime
  - `search(page, size)` - Listar com paginação
  - `findById(id)` - Buscar por ID
  - `update(id, request)` - Atualizar espécime
  - `delete(id)` - Deletar espécime

### 7. MediaService (`media.service.ts`)
- **Endpoint Base**: `/api/media`
- **Funcionalidades**:
  - `create(request)` - Criar mídia
  - `uploadImage(objectId, file, description, uploadedById)` - Upload de imagem
  - `search(page, size)` - Listar com paginação
  - `findByObjectId(objectId, page, size)` - Buscar mídia por objeto
  - `findById(id)` - Buscar por ID
  - `update(id, request)` - Atualizar mídia
  - `delete(id)` - Deletar mídia

## Modelos TypeScript Criados

### User Models
- `User` - Interface do usuário
- `UserLoginRequest` - Dados para login
- `UserLoginResponse` - Resposta do login
- `UserRegisterRequest` - Dados para registro

### Species Models
- `SpeciesTaxonomy` - Interface da taxonomia
- `SpeciesTaxonomyRequest` - Dados para criar/atualizar taxonomia

### Collection Models
- `CollectionArea` - Interface da área de coleta
- `CollectionAreaRequest` - Dados para criar/atualizar área
- `Plot` - Interface da parcela
- `PlotRequest` - Dados para criar/atualizar parcela

### Specimen Models
- `SpecimenObject` - Interface do objeto espécime
- `SpecimenObjectRequest` - Dados para criar/atualizar espécime

### Media Models
- `Media` - Interface da mídia
- `MediaRequest` - Dados para criar/atualizar mídia
- `MediaType` - Enum dos tipos de mídia (IMAGEM, VIDEO, DOCUMENTO)

## Utilitários e Configurações

### API Configuration (`api.config.ts`)
- Centraliza todas as URLs dos endpoints da API

### API Utils (`api.utils.ts`)
- `createPaginationParams()` - Cria parâmetros de paginação
- `createParams()` - Cria HttpParams de objeto
- `buildUrl()` - Constrói URLs com path parameters

### Auth Interceptor (`auth.interceptor.ts`)
- Adiciona automaticamente `withCredentials: true` para requisições da API
- Configura headers padrão

### Arquivo Barrel (`index.ts`)
- Exporta todos os services e modelos para facilitar importação

## Como Usar

```typescript
import { 
  AuthService, 
  SpeciesTaxonomyService, 
  CollectionAreaService,
  User,
  SpeciesTaxonomy 
} from '@/core';

// Ou importações específicas
import { AuthService } from '@/core/services/auth.service';
```

Todos os services seguem o padrão CRUD e utilizam Observables do RxJS para operações assíncronas.
