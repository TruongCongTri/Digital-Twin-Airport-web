# 🚀 Enterprise Next.js Boilerplate

An Enterprise-grade boilerplate built with Next.js App Router, Tailwind CSS, Zustand, React Hook Form, Zod, and Axios.

## 🛠 Environment Setup

Clone the repository to your local machine.

Run npm install to install dependencies.

Duplicate the .env.example file, rename it to .env, and fill in the required environment variables.

Run npm run dev to start the development server.

## 🤖 Automated Code Scaffolding (Plop.js)

This project strictly utilizes Plop.js to automatically generate structurally compliant files. To maintain architectural consistency and avoid errors, absolutely DO NOT create files or folders manually.

Run the following command in your Terminal whenever you need to add a new feature or component:

npm run generate


The system will prompt you with 3 options:

page: Create a new Route/Page (Automatically includes layout.tsx, loading.tsx, error.tsx, and an internal _components folder).

local-ui: Create a localized UI Component scoped strictly to a specific route's _components directory.

global-ui: Create a globally reusable Component (e.g., Buttons, Modals, Containers, Shells) placed in components/ui or components/layouts.