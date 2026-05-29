import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { getTransactionHistory } from '../../services/api/stakingService';
import type { TxType } from '../../types/staking';
import DataTable, { type ColumnConfig, type FilterOption } from '../common/DataTable';

type Filter = TxType | 'ALL';

const FILTERS: FilterOption[] = [
  { key: 'ALL', label: 'All' },
  { key: 'STAKE', label: 'Stake' },
  { key: 'UNSTAKE', label: 'Unstake' },
  { key: 'CLAIM', label: 'Claim' },
];

const COLUMNS: ColumnConfig[] = [
  { key: 'date',   label: 'Date',   type: 'date',   sortable: true },
  { key: 'type',   label: 'Type',   type: 'badge',  sortable: true },
  { key: 'token',  label: 'Token',  type: 'text',   sortable: true },
  { key: 'amount', label: 'Amount', type: 'number', sortable: true,
    render: (val) => <span style={{ fontWeight: 600 }}>{Number(val).toFixed(2)}</span> },
  { key: 'status', label: 'Status', type: 'status', sortable: false },
  { key: 'txHash', label: 'Tx Hash', type: 'hash',  sortable: false },
];

export default function TransactionTable() {
  const { address } = useAppKitAccount();
  const [filter, setFilter] = useState<Filter>('ALL');

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['txHistory', address, filter],
    queryFn: () => getTransactionHistory(address ?? '', filter),
  });

  const handleFilterChange = (key: string) => {
    setFilter(key as Filter);
  };

  return (
    <DataTable
      columns={COLUMNS}
      data={txs as unknown as Record<string, unknown>[]}
      loading={isLoading}
      pageSize={5}
      title="Transaction History"
      subtitle="All your staking activity"
      searchable
      filters={FILTERS}
      activeFilter={filter}
      onFilterChange={handleFilterChange}
      onSort={(key, dir) => console.log('sort', key, dir)}
      onPageChange={(page, total) => console.log('page', page, '/', total)}
      onSearch={(q) => console.log('search', q)}
      onClear={() => setFilter('ALL')}
      emptyText="No transactions found"
      emptyIcon="📭"
    />
  );
}
