import type { NextConfig } from "next";

const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb', // Increase for PDF uploads
        },
    },
    api: {
        bodyParser: {
            sizeLimit: '10mb', // For API routes
        },
    },
}

module.exports = nextConfig;
