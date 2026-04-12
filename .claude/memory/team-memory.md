# Team Memory - Multi-Agent System

This shared memory file tracks work completed by the multi-agent team (Code, Code-Review, Performance).

## How This Works

Each agent is responsible for updating this file with their activity:
- **Code Agent**: Updates after implementing tasks or fixing issues
- **Code-Review Agent**: Updates after reviewing code
- **Performance Agent**: Updates after performance analysis

---

## Code Agent Activity

### [Date]
- **Task**: [description]
- **Files Modified**: [list of files]
- **Changes Summary**: [brief description]

---

## Code-Review Agent Activity

### [Date]
- **Task Reviewed**: [description]
- **Result**: [APPROVED / ISSUES FOUND]
- **Issues Found**: [number]
- **Files Reviewed**: [list]

---

## Performance Agent Activity

### [Date]
- **Analysis Scope**: [what was analyzed]
- **Critical Issues**: [number]
- **High Priority**: [number]
- **Medium Priority**: [number]
- **Report Location**: [docs/performance/file.md]

---

## Workflow Summary

The multi-agent workflow follows this pattern:

1. **Code** implements the task
2. **Code-Review** reviews the implementation
   - If issues found → loop back to **Code** to fix
   - If approved → continue
3. **Performance** analyzes for improvements
4. All agents update this memory file with their work

## Recent Activity History

*No activity recorded yet. The agents will add their work here.*
