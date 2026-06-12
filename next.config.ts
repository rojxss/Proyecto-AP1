import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Permite cookies en Server Components via @supabase/ssr
  },
}

export default nextConfig
