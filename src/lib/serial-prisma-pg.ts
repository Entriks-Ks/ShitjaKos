import { PrismaPg } from "@prisma/adapter-pg";

type Adapter = Awaited<ReturnType<PrismaPg["connect"]>>;
type Transaction = Awaited<ReturnType<Adapter["startTransaction"]>>;

// Prisma's relation loader can dispatch concurrent queries within a transaction.
// pg requires one in-flight query per connection. Queue only that transaction's
// operations, including cleanup, leaving the pool's other connections independent.
// Workaround for https://github.com/prisma/orm/issues/29407.
export function serializeTransaction(tx: Transaction): Transaction {
  let tail: Promise<unknown> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    // Preserve the rejection for the caller, but allow rollback after a failure.
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return {
    provider: tx.provider,
    adapterName: tx.adapterName,
    options: tx.options,
    queryRaw: (query) => enqueue(() => tx.queryRaw(query)),
    executeRaw: (query) => enqueue(() => tx.executeRaw(query)),
    commit: () => enqueue(() => tx.commit()),
    rollback: () => enqueue(() => tx.rollback()),
    ...(tx.createSavepoint && {
      createSavepoint: (name: string) => enqueue(() => tx.createSavepoint!(name)),
    }),
    ...(tx.rollbackToSavepoint && {
      rollbackToSavepoint: (name: string) => enqueue(() => tx.rollbackToSavepoint!(name)),
    }),
    ...(tx.releaseSavepoint && {
      releaseSavepoint: (name: string) => enqueue(() => tx.releaseSavepoint!(name)),
    }),
  };
}

export class SerialPrismaPg extends PrismaPg {
  override async connect() {
    const adapter = await super.connect();
    const startTransaction = adapter.startTransaction.bind(adapter);
    adapter.startTransaction = async (isolationLevel) =>
      serializeTransaction(await startTransaction(isolationLevel));
    return adapter;
  }
}
