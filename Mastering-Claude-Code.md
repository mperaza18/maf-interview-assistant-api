# Mastering Claude Code — Project Validation Report

**Proyecto:** `maf-interview-assistant-api`
**Fecha:** 2026-05-01
**Referencia:** Boris @ Anthropic — "Maximizing Claude Code" (youtube.com/watch?v=6eBSHbLKuN0)

---

## Resumen Ejecutivo

El proyecto tiene una base sólida: `CLAUDE.md` bien documentado, historial de commits limpio, sin secretos expuestos en el repo, y configuración de permisos básica en `.claude/settings.local.json`. Sin embargo, hay cinco áreas concretas donde el flujo de trabajo con Claude Code puede mejorar significativamente.

---

## Evaluación por Área

### 1. Introducción y Configuración ✅ Bueno / ⚠️ Mejorable

**Lo que está bien:**
- La app GitHub (`gh`) está configurada y habilitada en los permisos del proyecto.
- El proyecto tiene `.claude/settings.local.json` activo desde el inicio.
- El `.gitignore` excluye correctamente `appsettings.Development.json` para proteger credenciales.

**Oportunidades de mejora:**

| Problema | Detalle |
|---|---|
| `settings.local.json` tiene un permiso con ruta hardcodeada | `"Bash(git -C /Users/mikeperaza/Dev/maf-interview-assistant-api log --oneline -10)"` usa una ruta absoluta personal. Si otro dev clona el repo, este permiso no sirve. Cambiar a un patrón más genérico: `"Bash(git log *)"` |
| Comandos `dotnet` no están permitidos | `dotnet build`, `dotnet run`, `dotnet restore` no aparecen en el allowlist. Claude pedirá confirmación cada vez que los necesite, interrumpiendo el flujo agéntico. |
| No hay `settings.json` compartible para el equipo | Solo existe `settings.local.json` (personal/ignorado por git). Un `settings.json` con permisos de `dotnet` y `git` beneficiaría a cualquier colaborador. |

**Acción recomendada:** Agregar al `.claude/settings.json` (versionado):
```json
{
  "permissions": {
    "allow": [
      "Bash(dotnet build*)",
      "Bash(dotnet run*)",
      "Bash(dotnet restore*)",
      "Bash(dotnet test*)",
      "Bash(git log*)",
      "Bash(git diff*)",
      "Bash(git status*)",
      "Bash(gh repo *)",
      "Bash(gh pr *)"
    ]
  }
}
```

---

### 2. Q&A sobre el Código ✅ Muy Bueno

**Lo que está bien:**
- `CLAUDE.md` documenta la arquitectura, el flujo de requests, y las decisiones de diseño clave. Claude puede responder preguntas de contexto sin necesidad de exploración adicional.
- El historial de git es limpio y descriptivo (10 commits con mensajes tipo `feat:`, `docs:`). Claude puede usar `git log` para entender la evolución del proyecto.
- `README.md` incluye ejemplos `curl` del workflow completo — contexto excelente para Q&A.
- No se requiere indexación externa: todo el código está local y bien estructurado.

**Oportunidades de mejora:**

| Problema | Detalle |
|---|---|
| No hay Issues de GitHub vinculados | El video menciona que Claude puede analizar issues para responder preguntas sobre bugs o features pendientes. El repo no tiene issues activos ni referencia a un backlog. |
| `CLAUDE.md` no menciona las limitaciones conocidas | Por ejemplo: no hay tests, el CORS es abierto en dev, la dependencia de Azure OpenAI requiere credenciales activas. Incluir esto ayuda a Claude a contextualizarse en preguntas de debugging. |

---

### 3. Edición y Automatización ⚠️ Área Principal de Mejora

**Lo que está bien:**
- Los PRs existentes (#1, #2) muestran que se usa un flujo de rama por feature — buena práctica para el trabajo agéntico de Claude.

**Oportunidades de mejora:**

| Problema | Detalle |
|---|---|
| **No hay tests automatizados** | `CLAUDE.md` lo declara explícitamente: *"There are no automated tests in this repo yet."* Esto es el gap más crítico. Sin tests, Claude no puede verificar sus cambios de forma autónoma. El video recomienda que Claude ejecute la suite de pruebas después de cada edición significativa. |
| **No hay MCP servers configurados** | El `.claude/settings.local.json` no registra ningún MCP server. Para este proyecto, un MCP de Azure o de testing HTTP (ej. `@anthropic-ai/mcp-server-fetch`) permitiría a Claude probar los endpoints directamente durante el desarrollo. |
| **No hay comandos slash personalizados a nivel de proyecto** | No existe un directorio `.claude/commands/` en el repo. Comandos como `/run-api`, `/test-endpoint`, o `/check-swagger` acelararían tareas repetitivas durante el desarrollo. |

**Acción recomendada para tests:** Agregar al menos un proyecto de integración básico:
```bash
dotnet new xunit -n InterviewAssistant.Api.Tests
dotnet sln add InterviewAssistant.Api.Tests/
```
Luego documentar en `CLAUDE.md` cómo ejecutarlos.

---

### 4. Contexto y Personalización ✅ Bueno / ⚠️ Mejorable

**Lo que está bien:**
- `CLAUDE.md` (proyecto) está presente y es el más detallado que debería ser: comandos, configuración, arquitectura, decisiones de diseño. Cumple exactamente con lo que el video describe.
- `~/.claude/settings.json` global tiene plugins habilitados (`superpowers`, `frontend-design`, `skill-creator`, `youtube-search`).
- La jerarquía de configuración global → proyecto está correctamente establecida.

**Oportunidades de mejora:**

| Problema | Detalle |
|---|---|
| No hay `CLAUDE.md` global en `~/` | El video menciona que se puede tener un `CLAUDE.md` global con preferencias personales (estilo de código, idioma preferido, comportamientos por defecto). El archivo global `~/.claude/settings.json` solo tiene plugins. |
| El `CLAUDE.md` del proyecto no menciona cómo colaborar con Claude | Faltan instrucciones de flujo de trabajo: ej. "antes de hacer cambios grandes, genera un plan", "crea un PR por feature", "nunca commitees a `main` directo". |
| Falta mencionar herramientas de entorno | `CLAUDE.md` no indica qué versión de .NET SDK se espera ni cómo verificar que el entorno está listo (`dotnet --version`, Azure CLI instalado, etc.). |

**Acción recomendada:** Agregar una sección `## Working with Claude` al `CLAUDE.md`:
```markdown
## Working with Claude

- Before significant changes, ask Claude to generate a plan first.
- Always create a feature branch; never commit directly to `main`.
- Run `dotnet build` to verify changes before committing.
- Azure CLI must be installed and logged in if no `ApiKey` is set.
```

---

### 5. Atajos y Productividad ✅ No Aplicable a Nivel de Proyecto

Esta sección del video (`Shift+Tab`, `!`, `Esc`) corresponde a hábitos del usuario en la terminal, no a configuración del proyecto. No hay nada que validar en el repo.

**Recomendación general para el usuario:**
- Usar `!dotnet build` dentro de Claude Code para verificar compilación sin salir del contexto.
- Usar `Shift+Tab` para aprobar ediciones en cadena sin interrupciones cuando Claude trabaja en múltiples archivos.
- Configurar dictado por voz para prompts largos (especialmente útil para describir requirements de agentes en `AgentPrompts.cs`).

---

## Tabla de Estado General

| Área | Estado | Prioridad de Mejora |
|---|---|---|
| Configuración inicial y permisos | ⚠️ Parcial | Alta — permisos `dotnet` faltantes bloquean automatización |
| Q&A sobre el código | ✅ Bien cubierto | Baja |
| Tests y automatización | ✅ Implementado (PR #3) | — |
| MCP servers | ❌ No configurado | Media |
| Comandos slash personalizados | ❌ Ausente | Baja |
| CLAUDE.md del proyecto | ✅ Completo | Baja — solo pequeños añadidos |
| Jerarquía de configuración | ⚠️ Parcial | Media — falta `settings.json` versionado |
| CLAUDE.md global | ⚠️ Ausente | Baja |

---

## Acciones Priorizadas

### 🔴 Alta Prioridad
1. ~~**Agregar tests** — Crear `InterviewAssistant.Api.Tests` con al menos tests de integración para los 4 endpoints. Sin esto, el flujo agéntico de Claude no puede auto-verificar cambios.~~ ✅ **DONE** — PR #3: 12 unit tests + 5 integration tests, two-project architecture.

### 🟡 Media Prioridad
2. **Crear `.claude/settings.json` versionado** — Mover permisos genéricos (`dotnet *`, `git *`) a un archivo compartible con el equipo.
3. **Corregir el permiso hardcodeado** — Reemplazar `"Bash(git -C /Users/mikeperaza/... log --oneline -10)"` por `"Bash(git log*)"` en `settings.local.json`.
4. **Configurar un MCP server de HTTP** — Permitir que Claude pruebe los endpoints en vivo durante el desarrollo.

### 🟢 Baja Prioridad
5. **Agregar sección `## Working with Claude`** al `CLAUDE.md` con instrucciones de flujo de trabajo.
6. **Crear `.claude/commands/`** con comandos slash para tareas frecuentes del proyecto.
7. **Crear `~/.claude/CLAUDE.md` global** con preferencias personales de colaboración.

---

*Generado con Claude Code — claude-sonnet-4-6*
