---
paths:
  - "apps/api/**/*.ts"
  - "apps/api/**/*.md"
  - "apps/api/prisma/**/*"
---

# Backend Modular Monolith Rules

- Treat `apps/api` as a production modular monolith, not a flat Nest app.
- Each module must keep its public API and its implementation inside its own folder.
- Minimum module ownership:
  - controller or controllers
  - application service or use-case classes
  - transport types or DTOs
  - Swagger or API docs models
  - tests
  - module wiring
- Recommended internal split for non-trivial modules:
  - `application/` for orchestration and use cases
  - `domain/` for policies, invariants, and pure business rules
  - `persistence/` for Prisma-backed repositories or query services
  - `dto/` for transport contracts local to the module
  - `docs/` for Swagger-specific models if shared contracts are not sufficient

- Controllers must not contain business rules, data access, encryption logic, payment logic, or cache invalidation logic.
- Controllers must never talk to Prisma or infrastructure adapters directly.
- Services must not grow into god objects. Split before a file crosses 200 lines or mixes unrelated reasons to change.
- If a workflow touches caching, notifications, persistence, and domain policy, separate those responsibilities into collaborators.
- Use stable patterns consistently:
  - adapter pattern for external providers
  - repository or query-service pattern for persistence
  - strategy or policy objects for branching business rules
  - factory builders for complex object creation where needed

- Every new or modified source file must start with a concise header comment:

```ts
/**
 * Purpose: <what this file does>
 * Why important: <why the system needs it>
 * Used by: <the files, modules, or request flows that depend on it>
 */
```

- No source file may exceed 200 physical lines.
- If a file already exceeds 200 lines, the next change to that file must reduce or split it.
- Empty placeholder directories such as unused `dto/` folders are not allowed.
- Module READMEs or app READMEs must be updated when structure, run commands, or ownership boundaries change.
