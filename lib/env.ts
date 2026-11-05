export const env = { googleSheets: { clientEmail: (process.env.GOOGLE_CLIENT_EMAIL || "").trim(), privateKey: (process.env.GOOGLE_PRIVATE_KEY || "").trim().replace(/\\n/g, "\n") } } as const
