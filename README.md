# MITVault

### Previous Year Question Papers, All in One Place.

**MITVault** is a web application built to help students of **Manipal Institute of Technology (MIT), Manipal** easily find and access previous year question papers (PYQs).

Instead of searching through scattered Google Drive folders, WhatsApp groups, and other sources, MITVault provides a centralized, organized, and searchable platform for accessing past examination papers.

Built with Next.js, TypeScript, Tailwind CSS, Supabase, and Cloudflare R2, MITVault focuses on simplicity, accessibility, and a clean user experience.

**Live Website:** https://mitvault.vercel.app

## Features

- **Centralized PYQ Repository** — Access previous year question papers from a single platform.
- **Semester-wise Organization** — Browse subjects and question papers organized by semester.
- **Quick Search** — Find subjects and their available papers without manually browsing through folders.
- **Easy Paper Access** — Open available question papers directly from the platform.
- **Light & Dark Mode** — Switch between themes based on your preference.
- **Responsive Design** — A clean interface designed for desktop and mobile devices.
- **Minimal UI** — A distraction-free experience focused on finding what you need.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js (App Router) | Full-stack React framework |
| TypeScript | Type-safe development |
| Tailwind CSS | Styling and responsive design |
| React | Component-based user interface |
| Supabase | Database management |
| Cloudflare R2 | Object storage for question paper PDFs |
| Vercel | Hosting and deployment |

## Getting Started

To run MITVault locally, follow these steps.

### 1. Clone the repository

```bash
git clone https://github.com/DhanunjayVemu/MITvault.git
```

### 2. Navigate to the project directory

```bash
cd MITvault
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env.local` file in the project root and configure the environment variables required for your Supabase and Cloudflare R2 integrations.

Use the environment variable names expected by the application.

Never commit `.env.local` or other files containing credentials to GitHub.

### 5. Start the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser to view the application.

## Project Structure

The repository is organized into the following main directories:

```text
MITvault/
├── app/                  # Next.js App Router pages and application logic
├── components/           # Reusable React UI components
├── data/                 # Application data and related definitions
├── lib/                  # Shared utilities and integrations
├── public/               # Static assets
├── supabase/             # Supabase-related files
│
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── tsconfig.json
└── README.md
```

## Architecture

MITVault uses a modern web architecture to provide a simple interface for accessing academic resources.

**Frontend**

Next.js and React power the user interface, while Tailwind CSS handles styling and responsive layouts.

**Database**

Supabase is used to store and manage application data, enabling structured organization and retrieval of academic resources.

**Object Storage**

Cloudflare R2 provides object storage for question paper PDFs, separating file storage from the application database.

**Deployment**

The application is hosted on Vercel, providing production hosting for the Next.js application.

## Design

MITVault follows a minimal, content-focused design approach inspired by [component.gallery](https://component.gallery).

The interface supports light and dark themes, with user preferences saved locally for a consistent browsing experience.

## Build for Production

To create a production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Project Goal

MITVault was created to make exam preparation more convenient for MIT Manipal students by reducing the time spent searching for previous year question papers.

The goal is simple: **make academic resources easier to find, access, and use.**

## Contributing

Contributions, suggestions, and improvements are welcome.

If you would like to contribute:

1. Fork the repository.
2. Create a new branch for your changes.
3. Commit your changes.
4. Push your branch.
5. Open a pull request.

You can also open an issue to report bugs or suggest new features.

## Disclaimer

MITVault is an independent student project and is not officially affiliated with or endorsed by Manipal Institute of Technology or Manipal Academy of Higher Education.

Question papers are provided for educational reference purposes. Rights to the original materials remain with their respective owners.

---

**Built for the students of MIT Manipal.**
