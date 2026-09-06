# Deals Registration Portal - Production Deployment Guide

> [!IMPORTANT]
> **Production Standard:** The Deals Registration Portal is officially deployed using **[Dokploy](https://dokploy.com/)** with **Nixpacks** and **Traefik**.
> 
> 👉 **Please refer to the comprehensive guide here: [DOKPLOY_DEPLOYMENT.md](./DOKPLOY_DEPLOYMENT.md)**

---

## Summary of Dokploy Architecture

- **PaaS Host**: Dokploy on Linux/Docker host.
- **Build Engine**: Nixpacks auto-detecting the Turborepo monorepo at root `/`.
- **Ingress & SSL**: Traefik with automated Let's Encrypt certificates.
- **Port**: Internal container port `3000` (`next start -H 0.0.0.0`).
- **Database**: Microsoft SQL Server connection via `DATABASE_URL`.

For detailed step-by-step setup instructions, domain routing, and environment variables checklist, see [DOKPLOY_DEPLOYMENT.md](./DOKPLOY_DEPLOYMENT.md).
