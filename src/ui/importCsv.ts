import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

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

/**
 * Read a URI as text.
 *
 * expo-file-system's File class is native-only; on web the picker hands back a
 * blob: URL, where fetch is the right reader.
 */
async function readText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Could not read the file (${response.status}).`);
    return response.text();
  }
  return new File(uri).text();
}

/** Opens the system picker. Returns null if the user backed out. */
export async function pickAndParseCsv(): Promise<ImportResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: CSV_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.length) return null;

  const asset = picked.assets[0];
  const text = await readText(asset.uri);
  return { sets: parseStrengthLogCsv(text), fileName: asset.name };
}
