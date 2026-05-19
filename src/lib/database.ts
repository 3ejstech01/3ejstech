export { localDb, syncFromRemote } from './unified-db';
export { localDb as default } from './unified-db';

export async function getEloadTransactionsByAccount(accountNumber: string) {
  const { getAllEload } = await import('./unified-db');
  const allTransactions = await getAllEload();
  return allTransactions.filter(t => t.accountNumber === accountNumber);
}
