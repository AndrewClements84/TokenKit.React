# TokenKit.React

A **full-stack UI** for [TokenKit](https://www.nuget.org/packages/TokenKit/) featuring a **Vite + React + Tailwind** front‑end and a **.NET 8 minimal API** back‑end.

- Spotify/Xbox inspired theme with **dark & light modes**
- Pick **model** and **engine** (`default`, `sharptoken`, `mltokenizers`)
- Run **Analyze** or **Validate**
- **Upload** a `models.json` to merge into the registry
- Swagger at `/swagger`

> The backend references `TokenKit` **v1.0.0** to power tokenization and registry features.

## Structure

```
TokenKit.React/
├─ backend/            # ASP.NET Core minimal API
│  ├─ TokenKit.React.Api.csproj
│  └─ Program.cs
└─ frontend/           # Vite + React + Tailwind
   ├─ src/App.tsx
   ├─ tailwind.config.js
   └─ ...
```

## Dev: run both

1. **Backend**
   ```bash
   dotnet restore ./backend
   dotnet run --project ./backend/TokenKit.React.Api.csproj
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm i
   npm run dev
   ```

The Vite dev server proxies `/api` to the backend.

## Build + serve from backend

```bash
# Build frontend
cd frontend
npm i
npm run build
cd ..

# Copy static files into backend/wwwroot
mkdir -p backend/wwwroot
cp -r frontend/dist/* backend/wwwroot/

# Run only the backend (serves the built UI at /)
dotnet run --project backend/TokenKit.React.Api.csproj
```

## API

- `GET /api/models?provider=&contains=` — list models (filter optional)
- `POST /api/analyze` JSON: `{ "input": "...", "model": "gpt-4o", "engine": "default" }`
- `POST /api/validate` JSON: `{ "input": "...", "model": "gpt-4o", "engine": "default" }`
- `POST /api/models/upload?replace=false` multipart: `file=models.json`
- `POST /api/models/merge` body: `[{...model...}]`

> Replace/merge assume TokenKit exposes `ModelRegistry.ReplaceAll/Merge` etc per your README. If your final API differs, adjust `Program.cs` accordingly.