# Feature: Múltiples presupuestos

**Objetivo:** Pasar de un único presupuesto por usuario a varios presupuestos con nombre — p. ej. "Presupuesto mensual" (el general de siempre) y "Fiesta de cumple" — que viven hasta que el usuario los archiva.

**Apps afectadas:** `backend/` (NestJS + Prisma) y `frontend/` (TanStack Start + TanStack Query + shadcn/ui).

**Estado:** Planning aprobado → pendiente de ejecución. Seguimiento en [#13](https://github.com/MigueMartelo/expense-tracker/issues/13).

---

## 1. Planning

### 1.1 Situación actual

- `Budget` tiene `userId @unique` → exactamente un presupuesto por usuario, creado de forma perezosa en `GET /budget` (`backend/src/budget/budget.service.ts`).
- `BudgetItem` (ítem, monto, categoría opcional) cuelga de ese presupuesto.
- `/budget` (`frontend/src/routes/_authenticated/budget/index.tsx`) lista los ítems y muestra el total.
- El presupuesto **no** se compara contra los gastos reales; es solo planificación.

### 1.2 Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Vigencia de un presupuesto | Sin fechas. Está **activo hasta que el usuario lo archiva**; los archivados se pueden restaurar. |
| Plan vs. gastado real | **Fuera de alcance** en esta entrega. Sigue siendo solo planificación. |
| Presupuesto existente | Se migra tal cual con el nombre "Presupuesto mensual". Ningún usuario pierde ítems. |
| ¿Presupuesto "principal" especial? | No. Todos los presupuestos son iguales; se ordenan por fecha de creación. Evita reglas especiales (no se puede archivar/borrar el principal, etc.). |
| Nombre de rutas API | Nuevo recurso REST `/budgets`. El viejo `/budget` se mantiene hasta que el frontend nuevo esté desplegado y luego se elimina. |
| Formato de trabajo | Este doc para diseño y decisiones; backlog y tickets en GitHub Issues (§2). |

### 1.3 Restricción de despliegue (importante)

`.github/workflows/migrate.yml` corre `prisma migrate deploy` **automáticamente al mergear a `main`**, mientras que el backend y el frontend se despliegan **a mano** con `scripts/deploy.sh`. Entre el merge y el deploy, producción corre **código viejo contra schema nuevo**.

Por eso los cambios de schema siguen el patrón **expand → migrate code → contract**:

1. *Expand:* solo agregar columnas con default / nullable. El código viejo sigue funcionando.
2. Desplegar el código que ya no depende de "un presupuesto por usuario".
3. *Contract:* quitar el índice único `budgets_user_id_key` (y luego el endpoint viejo).

Cada paso es un PR y un deploy por separado.

### 1.4 Modelo de datos objetivo

```prisma
model Budget {
  id         String       @id @default(uuid())
  userId     String       @map("user_id")              // ya no es @unique
  name       String       @default("Presupuesto mensual")
  archivedAt DateTime?    @map("archived_at")
  createdAt  DateTime     @default(now()) @map("created_at")
  updatedAt  DateTime     @updatedAt @map("updated_at")
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  items      BudgetItem[]

  @@index([userId])
  @@map("budgets")
}
```

`User.budget Budget?` pasa a ser `User.budgets Budget[]`.

### 1.5 API objetivo

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/budgets?archived=true\|false` | Lista (por defecto activos) con `itemCount` y `total` calculados |
| `POST` | `/budgets` | Crear `{ name }` |
| `GET` | `/budgets/:id` | Detalle con ítems + categoría |
| `PATCH` | `/budgets/:id` | `{ name?, archived? }` — renombrar / archivar / restaurar |
| `DELETE` | `/budgets/:id` | Borra el presupuesto y sus ítems (cascade) |
| `POST` | `/budgets/:id/items` | Crear ítem en ese presupuesto |
| `PATCH` | `/budgets/items/:itemId` | Editar ítem (igual que hoy) |
| `DELETE` | `/budgets/items/:itemId` | Borrar ítem (igual que hoy) |

Todas las rutas validan pertenencia (`budget.userId === user.id`) → `404` / `403` como hoy.

### 1.6 UX objetivo

- **`/budget`** → listado de presupuestos (tarjetas: nombre, total, n.º de ítems) con selector *Activos / Archivados* y botón "Nuevo presupuesto" (+ FAB en mobile, como hoy).
- **`/budget/$id`** → la página actual de ítems, con el nombre como título y un menú de acciones: Renombrar, Archivar / Restaurar, Eliminar (con confirmación).
- Un presupuesto archivado se ve en modo solo lectura con un banner "Archivado" y el botón Restaurar.

### 1.7 Fuera de alcance (backlog futuro)

- Comparar planeado vs. gastado (asignar gastos a un presupuesto, `expense.budgetId`).
- Fechas de inicio/fin y auto-archivado.
- Duplicar un presupuesto (p. ej. copiar el mensual como plantilla).
- Snapshots mensuales del presupuesto recurrente.
- Compartir presupuestos entre usuarios.

### 1.8 Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Código viejo contra schema nuevo tras el auto-migrate | Expand/contract en PRs separados (§1.3). |
| Frontend viejo cacheado llamando `/budget` | Se mantiene `/budget` hasta el ticket de limpieza. |
| Nombre de la migración de datos solo en español | Aceptado: es un dato del usuario y se puede renombrar. |
| Backend sin tests en CI | Se agregan tests del servicio y el paso en CI (BUD-09). |

---

## 2. Backlog y tickets

El seguimiento vive en GitHub: **[EPIC — Múltiples presupuestos (#13)](https://github.com/MigueMartelo/expense-tracker/issues/13)**, con las stories S1–S5 y los tickets como sub-issues.

| Ticket | Issue |
|--------|-------|
| BUD-01 — Migración *expand* (`name`, `archived_at`) | [#14](https://github.com/MigueMartelo/expense-tracker/issues/14) |
| BUD-02 — API `/budgets` | [#15](https://github.com/MigueMartelo/expense-tracker/issues/15) |
| BUD-03 — Migración *contract* (quitar unicidad de `user_id`) | [#16](https://github.com/MigueMartelo/expense-tracker/issues/16) |
| BUD-04 — Tipos y cliente API en el frontend | [#17](https://github.com/MigueMartelo/expense-tracker/issues/17) |
| BUD-05 — Página listado `/budget` | [#18](https://github.com/MigueMartelo/expense-tracker/issues/18) |
| BUD-06 — Diálogo crear / renombrar | [#19](https://github.com/MigueMartelo/expense-tracker/issues/19) |
| BUD-07 — Página detalle `/budget/$id` | [#20](https://github.com/MigueMartelo/expense-tracker/issues/20) |
| BUD-08 — Archivar, restaurar, renombrar, eliminar | [#21](https://github.com/MigueMartelo/expense-tracker/issues/21) |
| BUD-09 — Tests del servicio + backend en CI | [#22](https://github.com/MigueMartelo/expense-tracker/issues/22) |
| BUD-10 — Retirar el endpoint legacy `/budget` | [#23](https://github.com/MigueMartelo/expense-tracker/issues/23) |

Este documento recoge el diseño y las decisiones; el alcance de cada ticket, sus criterios de aceptación y su estado se mantienen en los issues. Si una decisión cambia durante la implementación, se actualiza aquí en el mismo PR.

---

## 3. Orden de ejecución y deploys

```
BUD-01 ──merge──▶ (auto-migrate) ──deploy backend 🚀
   │
BUD-02 (+ BUD-09 en paralelo) ──merge──▶ deploy backend 🚀
   │
BUD-03 ──merge──▶ (auto-migrate)
   │
BUD-04 → BUD-05 / BUD-06 → BUD-07 → BUD-08 ──merge──▶ deploy frontend 🚀
   │
BUD-10 ──merge──▶ deploy backend + frontend
```

Los tickets de frontend (BUD-04 → BUD-08) pueden ir en una sola rama/PR si se prefiere un único deploy de frontend.
