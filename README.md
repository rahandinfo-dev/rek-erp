This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# ERP transaction diagnostics

Sale and purchase writes have correlation-aware diagnostics. Verbose output is
disabled by default and is enabled **only** when
`ERP_TRANSACTION_DEBUG=true`. Logs contain operation/step identifiers and
sanitized Prisma/PostgreSQL error metadata; request bodies, credentials,
cookies, and authorization values are never logged.

```bash
ERP_TRANSACTION_DEBUG=true npm run dev
npm run verify:erp-transactions
```

The verifier requires `DATABASE_URL`, never prints it, opens a read-only
transaction, selects compatible fixture IDs, and checks stock aggregation,
document-item, and duplicate-movement invariants. It neither migrates nor
deletes data. If a write still fails, return the complete `ERP_OPERATION`
entries for its correlation ID, from `*_PRE_01_REQUEST_START` through the
first `FAILED` entry (including the sanitized `error` object).
