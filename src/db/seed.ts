/**
 * Siembra inicial: crea la fila única de configuración y las categorías por
 * defecto si la base está vacía. Idempotente.
 */
import { sql } from 'drizzle-orm';

import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { db } from './client';
import { budgetSettings, categories, llmConfig } from './schema';

export function seedIfNeeded() {
  // Fila única de configuración (id = 1).
  db.insert(budgetSettings)
    .values({ id: 1 })
    .onConflictDoNothing()
    .run();

  // Fila única de configuración del asistente de IA (id = 1).
  db.insert(llmConfig)
    .values({ id: 1 })
    .onConflictDoNothing()
    .run();

  // Categorías por defecto solo si no hay ninguna.
  const [{ count }] = db
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .all();

  if (count === 0) {
    db.insert(categories)
      .values(
        DEFAULT_CATEGORIES.map((c, i) => ({
          name: c.name,
          icon: c.icon,
          color: c.color,
          type: c.type,
          isDefault: true,
          sortOrder: i,
        })),
      )
      .run();
  }
}
