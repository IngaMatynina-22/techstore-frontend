# TechStore Frontend

Адміністративна панель магазину техніки (React + TypeScript + MUI).

## Стек

Vite, React 19, TypeScript, React Router, Axios, TanStack Query, React Hook Form + Zod, MUI 9, Recharts, Lucide, notistack.

## Запуск

1. Запустіть backend (proxy за замовчуванням → `http://127.0.0.1:5184`; змінити через `VITE_API_PROXY`).
2. У frontend:

```bash
npm install --legacy-peer-deps
npm run dev
```

Відкрийте `http://localhost:5173`. Cookie-сесія через Vite proxy. У sidebar — перемикач світлої/темної теми.

Seed admin: `admin@techstore.local` / `ChangeMe123!`

## Модулі

- `/` — dashboard
- `/catalog/*` — товари, категорії, бренди, характеристики
- `/inventory/*` — залишки, рухи, інвентаризація, склади
- `/orders/*`, `/purchasing/*`, `/returns/*`
- `/reports`, `/data/import`, `/data/export`
- `/admin/settings`, `/admin/audit-logs`, `/admin/system`
