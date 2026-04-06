import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'host', value: 'partenaire.garantieplus.fr' }],
        destination: 'https://devis.garantieplus.fr/inscription',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
