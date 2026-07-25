---
title: Performance Pack
---

> **Available in:** Professional, Business, Enterprise tiers

High-performance validation for large datasets with streaming validators, precompiled schemas, and progress tracking.

## Why Use Performance Pack

**Problem**: Standard validation is too slow for large datasets:
- Blocking validation of 100k+ records freezes applications
- Memory exhaustion when validating large arrays
- No progress feedback for long-running validation
- A single synchronous pass starves everything else on the event loop

**Solution**: Generate optimized streaming validators with chunking and progress hooks.

### Benefits

- **Streaming Validation**: Process data in chunks to avoid memory issues
- **Non-Blocking**: Yields to the event loop between chunks so the process stays responsive
- **Progress Tracking**: Real-time progress hooks for UX feedback
- **Memory Efficient**: Constant memory usage regardless of dataset size

## Prerequisites

```bash
# Core dependencies
pnpm add zod @prisma/client

# For streaming large files (optional)
pnpm add csv-parser stream-json

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enablePerformance = true
}
```

Then run:

```bash
prisma generate
```

### Generated Files

```
generated/
  pro/
    performance/
      precompiled.ts         # Precompiled validators + validator registry
      streaming.ts           # Streaming validators
      batch.ts               # Batch validation helpers
      utils.ts               # Shared performance utilities
      wrappers.ts            # Type-safe wrappers around the validators
      benchmarks.ts          # Benchmark suite you can run yourself
      README.md              # Performance tips
```

`precompiled.ts`, `streaming.ts`, `batch.ts`, and `benchmarks.ts` are each gated behind an option
(`enablePrecompilation`, `enableStreaming`, `enableBatching`, `generateBenchmarks`) — all default to
`true`. `utils.ts`, `wrappers.ts`, and `README.md` are always emitted.

## Basic Usage

Prefer the per-model wrapper — it binds the validator for you:

```ts
import { validateUserStream } from '@/generated/pro/performance/streaming'

const users = Array.from({ length: 100_000 }, (_, i) => ({
  email: `user${i}@example.com`,
  name: `User ${i}`,
}))

const result = await validateUserStream(users, {
  chunkSize: 1000,         // Process 1000 records at a time
  onProgress: (processed, total) => {
    console.log(`Progress: ${processed}/${total}`)
  },
  onError: (error, index) => {
    console.warn(`Invalid record at index ${index}:`, error)
  }
})

console.log(`Valid: ${result.valid.length}`)
console.log(`Invalid: ${result.invalid.length}`)
```

The generic form takes the schema name as its **first** argument:

```ts
import { validateStream } from '@/generated/pro/performance/streaming'

const result = await validateStream('User', users, { chunkSize: 1000 })
```

:::note `maxConcurrency` is accepted but unused
`StreamConfig` still declares `maxConcurrency`, but the current implementation validates each chunk
with `Promise.all` on the main thread and never reads it. There are no worker threads — setting it
changes nothing.
:::

## Example: CSV Validation

```ts
import fs from 'fs'
import csv from 'csv-parser'
import { validateUserStream } from '@/generated/pro/performance/streaming'

async function validateCSV(filePath: string) {
  const records: any[] = []

  // Read CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => records.push(row))
      .on('end', resolve)
      .on('error', reject)
  })

  // Validate with streaming
  const result = await validateUserStream(records, {
    chunkSize: 1000,
    onProgress: (processed, total) => {
      console.log(`Validated ${processed}/${total} records`)
    }
  })

  return result
}
```

## See Also

- [Data Factories](./factories.md) - Generate large test datasets
- [API Docs Pack](./api-docs.md) - Test performance with mock server
