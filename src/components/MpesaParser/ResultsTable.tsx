/**
 * ResultsTable.tsx - Display parsed M-Pesa transactions with export options
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { Download, Share2, FileText, TrendingUp } from 'lucide-react-native';
import { kenyaColors } from '@/theme/kenyaTheme';
import type { MpesaPdfTransaction, ParseStats } from '@/services/mpesaPdfParserService';

interface ResultsTableProps {
  transactions: MpesaPdfTransaction[];
  stats?: ParseStats;
  onExport: (format: 'csv' | 'json' | 'excel') => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  transactions,
  stats,
  onExport,
}) => {
  const formatAmount = useCallback((amount: number) => {
    return `Ksh ${amount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const totalAmount = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.paidIn, 0);
  }, [transactions]);

  const handleShare = async () => {
    try {
      const summary =
        `M-Pesa High Value Transactions (${transactions.length} items)\n` +
        `Total: ${formatAmount(totalAmount)}\n\n` +
        transactions
          .slice(0, 10)
          .map(
            (t) =>
              `${t.date} ${t.time} - ${t.details.substring(0, 40)}... - ${formatAmount(t.paidIn)}`
          )
          .join('\n') +
        (transactions.length > 10 ? `\n... and ${transactions.length - 10} more` : '');

      await Share.share({
        message: summary,
        title: 'M-Pesa High Value Transactions',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share results');
    }
  };

  const handleExport = (format: 'csv' | 'json' | 'excel') => {
    Alert.alert(
      `Export as ${format.toUpperCase()}`,
      `Download all ${transactions.length} transactions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => onExport(format),
        },
      ]
    );
  };

  const renderItem: ListRenderItem<MpesaPdfTransaction> = useCallback(({ item }) => (
    <View style={styles.tableRow}>
      <View style={styles.cellDate}>
        <Text style={styles.dateText}>{item.date}</Text>
        <Text style={styles.timeText}>{item.time}</Text>
        <Text style={styles.depotText}>{item.depotNo}</Text>
      </View>
      <View style={styles.cellDetails}>
        <Text style={styles.detailsText} numberOfLines={3}>
          {item.details}
        </Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              item.status === 'Completed' && styles.statusCompleted,
              item.status === 'Failed' && styles.statusFailed,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cellAmount}>
        <Text style={styles.amountText}>
          {formatAmount(item.paidIn)}
        </Text>
        {item.paidIn >= 10000 && (
          <View style={styles.highValueBadge}>
            <TrendingUp size={10} color="#f57c00" />
            <Text style={styles.highValueText}>HIGH</Text>
          </View>
        )}
      </View>
    </View>
  ), [formatAmount]);

  // keyExtractor for FlatList
  const keyExtractor = useCallback((item: MpesaPdfTransaction) => item.id || Math.random().toString(), []);

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FileText size={48} color="#ccc" />
        <Text style={styles.emptyText}>No high-value transactions found</Text>
        <Text style={styles.emptySubtext}>
          Only transactions above Ksh 5,000 are shown
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{transactions.length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{formatAmount(totalAmount)}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
          {stats && (
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.parsedLines}</Text>
              <Text style={styles.statLabel}>Parsed</Text>
            </View>
          )}
        </View>

        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('csv')}
          >
            <Download size={16} color={kenyaColors.safaricomGreen} />
            <Text style={styles.exportButtonText}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('excel')}
          >
            <Download size={16} color={kenyaColors.safaricomGreen} />
            <Text style={styles.exportButtonText}>Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('json')}
          >
            <Download size={16} color={kenyaColors.safaricomGreen} />
            <Text style={styles.exportButtonText}>JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton} onPress={handleShare}>
            <Share2 size={16} color="#666" />
            <Text style={styles.exportButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.headerCellDate}>Date & Time</Text>
        <Text style={styles.headerCellDetails}>Details</Text>
        <Text style={styles.headerCellAmount}>Amount</Text>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Showing {transactions.length} transactions above Ksh 5,000
            </Text>
            {stats && (
              <Text style={styles.statsText}>
                Parsed {stats.parsedLines} of {stats.totalLines} lines
              </Text>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 20
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#f8fff9',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: kenyaColors.safaricomGreen,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerCellDate: {
    padding: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    flex: 1.5,
  },
  headerCellDetails: {
    padding: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    flex: 2,
  },
  headerCellAmount: {
    padding: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 80,
  },
  cellDate: {
    padding: 12,
    justifyContent: 'center',
    flex: 1.5,
  },
  cellDetails: {
    padding: 12,
    justifyContent: 'center',
    flex: 2,
  },
  cellAmount: {
    padding: 12,
    justifyContent: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  depotText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  detailsText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  statusCompleted: {
    backgroundColor: '#e8f7eb',
  },
  statusFailed: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  amountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: kenyaColors.safaricomGreen,
  },
  highValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 2,
  },
  highValueText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#f57c00',
    letterSpacing: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: '#f8fff9',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statsText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default ResultsTable;
