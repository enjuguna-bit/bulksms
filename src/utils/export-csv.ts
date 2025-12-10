// ------------------------------------------------------
// 📤 src/utils/export-csv.ts
// Customer record CSV exporter (React Native CLI version)
// ------------------------------------------------------

import ReactNativeBlobUtil from 'react-native-blob-util';

/**
 * ✅ Exports customer name + phone records to a CSV file.
 * - Works fully offline using react-native-blob-util.
 * - Saves file in app cache directory for easy sharing.
 * - Returns the absolute file path.
 */
export async function exportCustomerRecordsToCSV(
  records: Array<{ name: string; phone: string }>
): Promise<string> {
  try {
    const header = 'Name,Phone\n';
    const rows = records.map(r => `${r.name},${r.phone}`).join('\n');
    const csv = header + rows;

    const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/customers_${Date.now()}.csv`;
    await ReactNativeBlobUtil.fs.writeFile(filePath, csv, 'utf8');

    console.log('✅ CSV exported:', filePath);
    return filePath;
  } catch (error) {
    console.error('❌ exportCustomerRecordsToCSV failed:', error);
    return '';
  }
}
