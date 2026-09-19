import * as DocumentPicker from 'expo-document-picker';

import { parseStrengthLogCsv } from '../core/parseCsv';
import type { SetRow } from '../core/types';

/**
 * CSV exported from the Files app arrives under inconsistent types — sometimes
 * `text/csv`, sometimes the UTI, sometimes plain text or a generic binary type.
 * Accept the lot rather than making a valid export unpickable.
 */
const CSV_TYPES = [
  'text/csv',
  'text/comma-separated-values',
  'public.comma-separated-values-text',
  'text/plain',
  'application/octet-stream',
];

export type ImportResult = { sets: SetRow[]; fileName: string };

/** Opens the system picker. Returns null if the user backed out. */
export async function pickAndParseCsv(): Promise<ImportResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: CSV_TYPES,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.length) return null;

  const asset = picked.assets[0];
  // On web the picker hands back a blob: URL, which fetch reads directly.
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error(`Could not read the file (${response.status}).`);
  return { sets: parseStrengthLogCsv(await response.text()), fileName: asset.name };
}
