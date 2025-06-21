// tsconfig.json
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    
    // --- THIS IS THE CRITICAL FIX ---
    // This tells TypeScript to start looking for paths from the project root (`.`).
    "baseUrl": ".",
    // This tells TypeScript that "@/*" means "look inside the ./src/ folder".
    "paths": {
      "@/*": ["./src/*"]
    },
    
    "plugins": [
      {
        "name": "next"
      }
    ],
    "forceConsistentCasingInFileNames": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
