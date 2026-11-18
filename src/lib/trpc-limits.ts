// Maximum procedure calls in one batched tRPC HTTP request (L8). The server rejects larger
// batches with 400; the client batch link uses the same limit so it never sends one.
export const MAX_BATCH_SIZE = 10;
