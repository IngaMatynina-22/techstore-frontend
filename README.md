# TechStore Frontend

Адміністративна панель магазину техніки (React + TypeScript + MUI).

## Стек

Vite, React 19, TypeScript, React Router, Axios, TanStack Query, React Hook Form + Zod, MUI 9, Recharts, Lucide, notistack.

## Запуск

1. Запустіть backend (proxy за замовчуванням → `http://127.0.0.1:5184`; змінити через `VITE_API_PROXY`).
2. За потреби скопіюйте `.env.example` у `.env.local` і заповніть контакти менеджера (`VITE_MANAGER_NAME`, `VITE_MANAGER_PHONE`, `VITE_MANAGER_EMAIL`). Вони відображаються на сторінці входу та в кабінеті покупця; після зміни перезапустіть Vite.
3. У frontend:

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

## Робота із замовленнями та імпортом

- Покупець оформлює замовлення без вибору складу. Менеджер призначає склад у деталях нового замовлення; доступне підтвердження після резервування товарів.
- У `/data/import` є окремий імпорт залишків постачальника. Він приймає CSV з обовʼязковими колонками `Sku,WarehouseCode,QuantityOnHand`; кнопка на сторінці завантажує шаблон з повним списком колонок.
