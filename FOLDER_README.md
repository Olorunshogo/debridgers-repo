# Stayar V2 Monorepo

Nx-powered monorepo for Stayar's frontend applications and shared component libraries.

## 📁 Project Structure

```
stayar-v2/
├── apps/                      # Applications
│   ├── stayer-tenant/        # Main Ionic React tenant app
│   ├── landing-page/         # Remix landing page
│   └── stayer-backend/       # NestJS backend
├── packages/                  # Workspace packages
│   ├── stayer-ui/
│   │   ├── app/              # @stayar/ui-app - Ionic components
│   │   └── web/              # @stayar/ui-web - Shadcn components
│   └── ionic-ui/             # Legacy Ionic UI components
├── libs/                      # Shared libraries
│   └── shared/
│       ├── theme/            # @stayar/shared/theme - Tailwind config
│       └── ui/               # @stayar/shared/ui - Shared UI utilities
└── .vscode/                  # VS Code workspace settings
```

## 🎨 Component Libraries

### @stayar/ui-app (Ionic Components)

**Location:** `packages/stayer-ui/app`
**Purpose:** Ionic React components for mobile/hybrid apps

**Key Features:**

- Ionic framework components
- Mobile-optimized UI
- Capacitor integration ready

**Usage:**

```typescript
import { IonicButton } from '@stayar/ui-app';

function MyComponent() {
  return <IonicButton>Click me</IonicButton>;
}
```

**Development:**

```bash
cd packages/stayer-ui/app
pnpm run build      # Build package
pnpm run watch      # Watch mode (HMR)
```

**Storybook:**

```bash
pnpm nx run @stayar/ui-app:storybook
```

---

### @stayar/ui-web (Shadcn Components)

**Location:** `packages/stayer-ui/web`
**Purpose:** Shadcn/ui components for web applications

**Key Features:**

- Radix UI primitives
- Tailwind CSS styling
- Accessible components
- Button, Dialog, AlertDialog

**Usage:**

```typescript
import { Button, Dialog } from '@stayar/ui-web';

function MyComponent() {
  return (
    <Dialog>
      <Button variant="primary">Open Dialog</Button>
    </Dialog>
  );
}
```

**Adding New Shadcn Components:**

```bash
cd packages/stayer-ui/web
pnpx shadcn@latest add [component-name]
```

**Development:**

```bash
cd packages/stayer-ui/web
pnpm run build      # Build package
pnpm run watch      # Watch mode (HMR)
```

**Storybook:**

```bash
pnpm nx run @stayar/ui-web:storybook
```

---

### @stayar/shared/theme

**Location:** `libs/shared/theme`
**Purpose:** Centralized Tailwind CSS configuration

**Key Features:**

- Custom color palette
- Shared design tokens
- Tailwind v4 compatible

**Usage:**
In any `tailwind.config.js`:

```javascript
import { join } from "path";
import preset from "@stayar/shared/theme";

export default {
  presets: [preset],
  content: [join(__dirname, "src/**/*.{ts,tsx,html}")],
};
```

---

### @stayar/shared/ui

**Location:** `libs/shared/ui`
**Purpose:** Shared UI utilities and base components

**Usage:**

```typescript
import { SharedUi } from "@stayar/shared/ui";
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10.15.0+

### Installation

```bash
# Install dependencies
pnpm install

# Prepare pre-commit hooks
pnpm run prepare
```

### Development

```bash
# Serve the tenant app
pnpm nx serve stayer-tenant

# Build an application
pnpm nx build stayer-tenant

# Run tests
pnpm nx test stayer-tenant

# Lint all code
pnpm run lint

# Format all code
pnpm run format
```

## 📦 Creating a New App

### 1. Generate Ionic React App

```bash
pnpm nx g @nx/react:app my-app \
  --directory=apps/my-app \
  --bundler=vite \
  --style=css \
  --routing=true
```

### 2. Install Ionic Dependencies

```bash
cd apps/my-app
pnpm add @ionic/react @ionic/react-router @ionic/core
pnpm add -D @capacitor/core @capacitor/cli
```

### 3. Configure Ionic

Create `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.stayar.myapp",
  appName: "My App",
  webDir: "dist/apps/my-app",
  server: {
    androidScheme: "https",
  },
};

export default config;
```

### 4. Setup Tailwind CSS

Create `tailwind.config.js`:

```javascript
import { join } from "path";
import preset from "@stayar/shared/theme";

export default {
  presets: [preset],
  content: [
    join(__dirname, "src/**/*.{ts,tsx,html}"),
    join(__dirname, "../../packages/stayer-ui/app/src/**/*.{ts,tsx}"),
  ],
};
```

Create `postcss.config.js`:

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### 5. Add Dependencies to package.json

```json
{
  "dependencies": {
    "@stayar/ui-app": "workspace:*",
    "@stayar/ui-web": "workspace:*",
    "@stayar/shared/theme": "workspace:*"
  }
}
```

### 6. Configure App Entry

Update `src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { setupIonicReact } from '@ionic/react';
import App from './app/app';

// Import Ionic CSS
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

// Import styles
import './styles.css';

setupIonicReact();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### 7. Update App Component

Update `src/app/app.tsx`:

```typescript
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
import { IonicButton } from '@stayar/ui-app';

export function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/">
            <div className="p-4">
              <h1>My App</h1>
              <IonicButton>Hello World</IonicButton>
            </div>
          </Route>
          <Route render={() => <Redirect to="/" />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}

export default App;
```

### 8. Run Your App

```bash
pnpm nx serve my-app
```

## 📚 Creating a New Library

### Generate Library

```bash
pnpm nx g @nx/react:library my-lib \
  --directory=libs/my-lib \
  --bundler=none \
  --unitTestRunner=vitest \
  --importPath=@stayar/my-lib
```

### Make It Buildable

Add `tsup` for building:

```bash
cd libs/my-lib
pnpm add -D tsup
```

Create `tsup.config.ts`:

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
});
```

Update `package.json`:

```json
{
  "name": "@stayar/my-lib",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "scripts": {
    "build": "tsup",
    "watch": "tsup --watch"
  }
}
```

## 🛠️ Development Workflow

### Working with Component Libraries

1. **Start watch mode** in your library:

   ```bash
   cd packages/stayer-ui/app
   pnpm run watch
   ```

2. **Serve your app** in another terminal:

   ```bash
   pnpm nx serve stayer-tenant
   ```

3. **Edit components** - HMR will reload automatically

### Code Quality

**Auto-format on save** - VS Code is configured to:

- Format with Prettier on save
- Auto-fix ESLint issues on save
- Sort Tailwind CSS classes

**Manual commands:**

```bash
pnpm run lint           # Check for issues
pnpm run lint:fix       # Auto-fix issues
pnpm run format         # Format all files
pnpm run format:check   # Check formatting
```

### Pre-commit Hooks

Husky is configured to:

- Run Prettier on staged files
- Located in `.husky/pre-commit`

## 🎯 Best Practices

### Component Organization

```
my-component/
├── my-component.tsx        # Component
├── my-component.spec.tsx   # Tests
├── my-component.stories.tsx # Storybook
└── my-component.module.css # Styles
```

### Importing Components

```typescript
// ✅ Good - from workspace packages
import { IonicButton } from "@stayar/ui-app";
import { Button } from "@stayar/ui-web";

// ❌ Bad - relative imports across packages
import { Button } from "../../packages/stayer-ui/web";
```

### Tailwind CSS

```typescript
// ✅ Good - classes are auto-sorted by Prettier
<div className="flex items-center justify-between p-4 bg-blue-500">

// Auto-formats to proper order:
<div className="flex items-center justify-between bg-blue-500 p-4">
```

## 🔧 Configuration Files

### ESLint (`eslint.config.mjs`)

- React + TypeScript rules
- React Hooks enforcement
- Prettier integration
- Nx module boundaries

### Prettier (`.prettierrc`)

- Single quotes
- Trailing commas
- 100 char line width
- **Tailwind CSS class sorting**

### TypeScript (`tsconfig.base.json`)

- Workspace path mappings
- Shared compiler options

### Nx (`nx.json`)

- Task caching
- Affected commands
- Build dependencies

## 📖 Useful Commands

### Nx Commands

```bash
# Run task for specific project
pnpm nx [target] [project]

# Run task for affected projects
pnpm nx affected -t build

# View project graph
pnpm nx graph

# Clear Nx cache
pnpm nx reset
```

### Package Commands

```bash
# Build all packages
pnpm nx run-many -t build

# Run Storybook for ui-app
pnpm nx run @stayar/ui-app:storybook

# Run Storybook for ui-web
pnpm nx run @stayar/ui-web:storybook
```

## 🚢 Building for Production

### Build All Apps

```bash
pnpm nx run-many -t build --all
```

### Build Specific App

```bash
pnpm nx build stayer-tenant --prod
```

### Build Output

- Apps: `dist/apps/[app-name]`
- Packages: `packages/[package-name]/dist`
- Libs: `libs/[lib-name]/dist`

## 🐛 Troubleshooting

### Module Not Found

```bash
# Clear Nx cache and node_modules
pnpm nx reset
rm -rf node_modules
pnpm install
```

### HMR Not Working

```bash
# Restart watch mode
cd packages/stayer-ui/app
pnpm run watch
```

### Linting Errors

```bash
# Auto-fix most issues
pnpm run lint:fix
```

### Build Errors

```bash
# Clean and rebuild
cd packages/stayer-ui/app
pnpm run clean
pnpm run build
```

## 📝 License

ISC

## 👥 Contributing

1. Create a feature branch
2. Make your changes
3. Format code: `pnpm run format`
4. Lint code: `pnpm run lint:fix`
5. Commit (pre-commit hooks will run)
6. Push and create PR

---

**Questions?** Check individual package READMEs or Nx documentation at https://nx.dev
