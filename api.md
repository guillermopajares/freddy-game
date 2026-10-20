# API de puntuaciones — Freddy Game

URL base: `https://freddygame.rodrycode.com/api`

Todas las respuestas son JSON.

| Método | Endpoint | Para qué |
|---|---|---|
| `GET` | `/api/ranking` | Ranking de las mejores puntuaciones. |
| `POST` | `/api/scores` | Guardar la puntuación de una partida terminada. |

---

## `GET /api/ranking`

Devuelve las X mejores puntuaciones, ordenadas de más a menos puntos. Si hay empate, va antes quien lo consiguió primero.

### Qué enviar (query string)

| Parámetro | Tipo | Obligatorio | Por defecto | Notas |
|---|---|---|---|---|
| `limit` | entero | No | `10` | Entre `1` y `100`. |

```
GET /api/ranking?limit=3
```

### Qué contesta

`200 OK`

```json
{
  "ranking": [
    { "position": 1, "username": "Freddy", "points": 15400, "created_at": "2026-10-20 21:25:07" },
    { "position": 2, "username": "David",  "points": 12100, "created_at": "2026-10-20 21:25:07" },
    { "position": 3, "username": "Ana",    "points": 9800,  "created_at": "2026-10-20 21:25:07" }
  ]
}
```

Si no hay puntuaciones, `ranking` es un array vacío.

### Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| `400` | `limit` no es un entero entre 1 y 100. | `{ "error": "limit debe ser un entero entre 1 y 100." }` |
| `405` | Método distinto de `GET`. | `{ "error": "Método no permitido. Usa GET." }` |
| `500` | Fallo del servidor. | `{ "error": "Error de base de datos." }` |

---

## `POST /api/scores`

Guarda la puntuación de una partida terminada.

### Qué enviar (cuerpo JSON)

Cabecera: `Content-Type: application/json`

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `username` | string | Sí | Entre 1 y 30 caracteres (se le quitan los espacios de los extremos). |
| `points` | entero | Sí | Mayor o igual que 0. Como número, no como texto (`1500`, no `"1500"`). |

```
POST /api/scores
Content-Type: application/json

{ "username": "Freddy", "points": 15400 }
```

### Qué contesta

`201 Created`

```json
{
  "id": 2,
  "username": "Freddy",
  "points": 15400,
  "created_at": "2026-10-20 21:25:07",
  "position": 1
}
```

`position` es el puesto que ocupa la puntuación recién guardada en el ranking.

### Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| `400` | El cuerpo no es un JSON válido. | `{ "error": "El cuerpo debe ser un JSON válido." }` |
| `405` | Método distinto de `POST`. | `{ "error": "Método no permitido. Usa POST." }` |
| `422` | `username` o `points` no válidos. | Ver ejemplo abajo. |
| `500` | Fallo del servidor. | `{ "error": "Error de base de datos." }` |

Ejemplo de `422` (solo aparecen los campos con error):

```json
{
  "error": "Datos no válidos.",
  "fields": {
    "username": "Obligatorio, entre 1 y 30 caracteres.",
    "points": "Obligatorio, entero mayor o igual que 0."
  }
}
```
