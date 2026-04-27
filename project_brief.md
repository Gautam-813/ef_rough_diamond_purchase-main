# Project Brief: EF Diamond ERP (v3.0)

## 1. Executive Summary
The goal is to evolve a high-complexity React diamond calculation dashboard into a multi-user, production-grade ERP. The system will handle complex yield/polish calculations for rough diamond purchasing, supporting 500+ professional users with real-time data persistence and binary asset management (media/docs).

## 2. Business Requirements
- **Multi-Tenancy:** Each user has an isolated workspace with their own "Notebooks" (Tenders/Parcels).
- **Heavy Math Engine:** Support for complex calculations including whole vs. sawn scenarios, fluorescence discounts, and granular price-list (PL-A/PL-M) mapping.
- **Master Files:** Users can save and lock their unique price lists and base configurations (Labour, Profit, Yields) as a "Master File."
- **Super Admin:** Ability to create, edit, and delete users, manage system-wide settings, and monitor load.
- **Media Support:** Ability to upload and stream high-resolution images, videos of stones, and PDF certificates/invoices.

## 3. Technical Architecture
- **Backend:** FastAPI (Python). Chosen for high performance, asynchronous request handling, and ease of mathematical integration.
- **Database:** PostgreSQL. Chosen for relational integrity of parcel data and JSONB support for flexible calculation overrides.
- **Storage:** Cloudflare R2 (S3-compatible). Specifically chosen for **Zero-Egress fees**, vital for streaming diamond videos to 500+ users without massive bandwidth costs.
- **Frontend:** React + Vite. To be refactored from a monolithic `App.jsx` into a modular component-based system using atomic design principles.
- **Security:** OAuth2 with JWT (JSON Web Tokens) and Argon2 password hashing.

## 4. Scalability Strategy (500+ Users)
- **Statelessness:** The backend will be stateless to allow horizontal scaling (multiple server instances).
- **Performance:** Implementing Redis caching for frequently accessed price lists.
- **Optimization:** Frontend memoization and lazy-loading to ensure the UI remains responsive under heavy calculation loads.

## 5. Persistence & Recovery
- All project progress is tracked in `progress.md`.
- Code changes are documented step-by-step to allow full recovery if necessary.
