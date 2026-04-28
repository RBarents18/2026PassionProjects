# 2026PassionProjects

A React + TypeScript app for tracking student passion projects, milestones, updates, budgets, and timeline progress in one place.

## Overview
This project provides a lightweight dashboard for managing passion projects from creation through completion. It supports project summaries, progress tracking, milestone planning, budget monitoring, update logs, and detailed project views.

## Features
- Create, view, edit, and delete projects
- Track project status (`on-track`, `needs-attention`, `at-risk`, `completed`)
- Store update history and recommendations
- Manage milestones with due dates and completion state
- Track budget items for planned and actual income/expenses
- Visualize timeline work with Gantt-style entries and dependencies
- Persist project data locally in browser storage
- Deploy to GitHub Pages

## Tech Stack
- React 19
- TypeScript
- Vite
- Tailwind CSS
- ESLint

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Install dependencies
```bash
npm install
```

### Start the development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Preview the production build locally
```bash
npm run preview
```

### Run linting
```bash
npm run lint
```

## Project Structure
- `src/App.tsx` — main app flow and view switching
- `src/components/` — UI components such as dashboard, forms, and detail views
- `src/types.ts` — shared TypeScript models for projects, updates, milestones, budgets, and Gantt entries
- `src/utils/` — utility helpers such as local storage persistence
- `public/` — static assets
- `.github/workflows/deploy.yml` — GitHub Pages deployment workflow

## Data Model Highlights
Projects include:
- student name
- title and description
- category and status
- start and target dates
- updates and notes
- budget items
- milestones
- Gantt entries and optional timeline image

## Deployment
This repository already includes a GitHub Actions workflow to build and deploy the app to GitHub Pages on pushes to `main`.

## Suggested Next Improvements
- Add screenshots or a short demo GIF to the README
- Add a live GitHub Pages URL in the repository About section
- Add repository topics such as `react`, `typescript`, `vite`, and `tailwindcss`
- Add a license if you want others to reuse the project
- Add issue templates for bugs and feature requests

## Status
Active project.
