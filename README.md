# Data Agents Platform

Plataforma multiagente de análisis de datos construida con Python + FastAPI + LangGraph.

## Arquitectura

```
Usuario → React Frontend
            ↓ REST API
         FastAPI Backend
            ↓
         Orquestador (LangGraph)
            ↓
  ┌─────────────────────────┐
  │  Agente 1: Analista     │ ← activo
  │  Agente 2: Ingeniero    │ ← v2
  │  Agente 3: Científico   │ ← v3
  │  Agente 4: Narrador     │ ← v4
  └─────────────────────────┘
```

## Stack

| Capa | Tecnología |
|---|---|
| API | FastAPI + Uvicorn |
| Orquestación | LangGraph |
| LLM | Anthropic Claude |
| Análisis | pandas + scipy |
| Deploy backend | Railway |
| Deploy frontend | Vercel |

## Setup local

### 1. Clonar y preparar entorno

```bash
git clone https://github.com/TU_USUARIO/data-agents-platform
cd data-agents-platform

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 2. Variables de entorno

```bash
cp backend/.env.example backend/.env
# Edita backend/.env y agrega tu ANTHROPIC_API_KEY
```

### 3. Arrancar el backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

La API estará disponible en:
- `http://localhost:8000` — raíz
- `http://localhost:8000/docs` — Swagger UI interactivo
- `http://localhost:8000/api/v1/health` — health check

### 4. Con Docker (recomendado para producción)

```bash
cp backend/.env.example backend/.env
# Edita backend/.env

docker-compose up --build
```

## Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/health` | Estado del servidor |
| POST | `/api/v1/upload` | Subir CSV/Excel/JSON para análisis |
| POST | `/api/v1/chat` | Chat con el agente sobre el dataset |

### Ejemplo: subir un archivo

```bash
curl -X POST http://localhost:8000/api/v1/upload \
  -F "file=@mi_dataset.csv"
```

### Ejemplo: hacer una pregunta

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Cuál es la columna con más valores nulos?",
    "dataset_summary": { ... },
    "history": []
  }'
```

## Tests

```bash
cd backend
python -m pytest tests/ -v
```

## Estructura del proyecto

```
data-agents-platform/
├── backend/
│   ├── app/
│   │   ├── agents/          # Agentes especializados
│   │   │   └── analyst.py   # Agente 1: análisis estadístico
│   │   ├── orchestrator/    # LangGraph pipeline
│   │   │   └── pipeline.py
│   │   ├── api/             # Rutas FastAPI
│   │   │   └── routes.py
│   │   ├── models/          # Schemas Pydantic
│   │   │   └── schemas.py
│   │   ├── services/        # Servicios reutilizables
│   │   │   └── file_router.py  # Patrón Strategy para parsers
│   │   ├── core/
│   │   │   └── config.py    # Configuración central
│   │   └── main.py          # Entry point FastAPI
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/                # React (próximo sprint)
├── docker-compose.yml
└── README.md
```

## Deploy en Railway

1. Crea una cuenta en [railway.app](https://railway.app)
2. Nuevo proyecto → Deploy from GitHub repo
3. Selecciona la carpeta `backend/` como root
4. Agrega las variables de entorno desde `.env.example`
5. Railway detecta el `Dockerfile` automáticamente

## Hoja de ruta

- [x] v1 — Agente Analista (EDA, stats, insights, chat)
- [ ] v2 — Agente Ingeniero (limpieza, pipelines, transformaciones)
- [ ] v3 — Agente Científico (ML, predicciones, evaluación)
- [ ] v4 — Agente Narrador (reportes PDF, presentaciones)
- [ ] Autenticación JWT
- [ ] Dashboard React completo
- [ ] Análisis asíncrono con Celery + Redis
