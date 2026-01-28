/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'swpjgeymolfdfvmchstr.supabase.co',
                port: '',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
