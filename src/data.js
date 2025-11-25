// sample data and helpers used by App and components
export const sampleVendors = [
  { id: 'V001', name: 'Alpha Vendors', contact: 'alpha@example.com', gst: '27AAAAA0000A1Z5', payment: '30 days', classification: 'A' },
  { id: 'V002', name: 'Beta Supplies', contact: 'beta@example.com', gst: '27BBBBB0000B2Z6', payment: '45 days', classification: 'B' }
]

export const sampleSuppliers = [
  { id: 'S001', name: 'Supplier One', contact: 's1@example.com', location: 'Mumbai', products: ['RM001','RM002'] },
  { id: 'S002', name: 'Supplier Two', contact: 's2@example.com', location: 'Pune', products: ['RM003'] }
]

export const sampleMaterials = [
  { code: 'RM001', name: 'Powder A', category: 'Chemical', uom: 'kg', reorder: 50, stock: 120, qcPending: 0, rejected: 0 },
  { code: 'RM002', name: 'Liquid B', category: 'Chemical', uom: 'litre', reorder: 30, stock: 20, qcPending: 10, rejected: 2 },
  { code: 'RM003', name: 'Granules C', category: 'Raw', uom: 'kg', reorder: 40, stock: 5, qcPending: 0, rejected: 0 }
]

export const sampleBOMs = {
  'FIN001': [ { material: 'RM001', qty: 2, wastage: 2 }, { material: 'RM002', qty: 1.5, wastage: 1 } ],
  'FIN002': [ { material: 'RM001', qty: 1, wastage: 1 }, { material: 'RM003', qty: 0.5, wastage: 5 } ]
}

export function load(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; }
}
export function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

export function round(v){ return Math.round((v+Number.EPSILON)*100)/100; }
