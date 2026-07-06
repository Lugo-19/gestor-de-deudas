/**
 * Exportación de datos. Genera un CSV de las transacciones y lo comparte con la
 * hoja de compartir del sistema (Share de React Native, sin dependencias extra).
 */
import { Share } from 'react-native';

import { db } from '@/db/client';
import { categories, transactions } from '@/db/schema';

export async function exportTransactionsCsv() {
  const cats = db.select().from(categories).all();
  const catMap = new Map(cats.map((c) => [c.id, c.name]));
  const rows = db.select().from(transactions).all();

  const header = 'fecha,tipo,categoria,monto,nota';
  const body = rows
    .map((t) => {
      const cat = t.categoryId ? catMap.get(t.categoryId) ?? '' : '';
      const note = (t.note ?? '').replace(/"/g, '""');
      return `${t.date},${t.type},"${cat}",${t.amount},"${note}"`;
    })
    .join('\n');

  const csv = `${header}\n${body}`;
  await Share.share({ message: csv, title: 'Exportar movimientos (CSV)' });
}
