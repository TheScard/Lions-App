/** @type {import('next').NextConfig} */
const nextConfig = {
  // Der Service Worker (public/sw.js) muss bei jeder Seitenladung frisch
  // abgerufen werden, sonst wuerden Browser/CDN eine veraltete Fassung
  // (z.B. ohne Push-Handling) weiter ausliefern.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
