export interface TableRecord {
  orderId: string;
  item: string;
  qty: number;
  price: number;
  createdAt: string;
  updatedAt: string;
  _status: string;
  [key: string]: any;
}

// Global in-memory store persisting during server session
const globalStore: {
  tables: Record<string, TableRecord[]>;
} = {
  tables: {
    OrdersTable: [
      {
        orderId: 'ord-init-9021',
        item: 'AWS Cloud Credits Starter Pack',
        qty: 1,
        price: 100,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        _status: 'ACTIVE',
      },
    ],
  },
};

export function insertTableRecord(tableName: string, record: TableRecord): TableRecord {
  if (!globalStore.tables[tableName]) {
    globalStore.tables[tableName] = [];
  }
  globalStore.tables[tableName].unshift(record);
  return record;
}

export function getTableRecords(tableName: string): TableRecord[] {
  return globalStore.tables[tableName] || [];
}
