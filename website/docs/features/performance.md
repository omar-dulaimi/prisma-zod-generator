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
- Single-threaded validation wastes CPU cores

**Solution**: Generate optimized streaming validators with chunking, concurrent processing, and progress hooks.

### Benefits

- **Streaming Validation**: Process data in chunks to avoid memory issues
- **Concurrent Processing**: Utilize multiple cores for parallel validation
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
      streaming.ts           # Streaming validators
      precompiled.ts         # Precompiled schemas for speed
```

## Basic Usage

```ts
import { validateStream } from '@/generated/performance/streaming'

const users = Array.from({ length: 100_000 }, (_, i) => ({
  email: `user${i}@example.com`,
  name: `User ${i}`,
}))

const result = await validateStream(users, {
  chunkSize: 1000,         // Process 1000 records at a time
  maxConcurrency: 4,       // Use 4 parallel workers
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

## Example: CSV Validation

```ts
import fs from 'fs'
import csv from 'csv-parser'
import { validateStream } from '@/generated/performance/streaming'

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
  const result = await validateStream(records, {
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
