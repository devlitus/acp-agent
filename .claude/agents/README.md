# Multi-Agent System for Claude Code

This directory contains a team of three specialized agents that work together to implement, review, and optimize code.

## Agents

| Agent | Purpose | Tools |
|-------|---------|-------|
| **Code** | Implements tasks and fixes issues | Read, Write, Edit, Bash, Glob, Grep, WebSearch |
| **Code-Review** | Reviews code against tasks, reports bugs | Read, Write, Edit, Bash, Glob, Grep, WebSearch |
| **Performance** | Analyzes performance, proposes improvements | Read, Write, Edit, Bash, Glob, Grep, WebSearch |

## Workflow

```
┌─────────────┐      Issues Found
│   Code      │◄──────────────────┐
│ (Implement) │                   │
└──────┬──────┘                   │
       │ Completed                │
       ▼                          │
┌─────────────┐ Approved           │
│ Code-Review │────────────────────┘
│   (Review)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Performance │
│ (Analyze)   │
└─────────────┘
```

## Usage

### Step 1: Start with Code Agent

```
/code
Implement [your task here]
```

The code agent will:
1. Read the team memory
2. Understand the task
3. Implement the solution
4. Update memory with changes made
5. Hand off to code-review

### Step 2: Code-Review Agent

Code agent automatically invokes code-review. You can also invoke directly:

```
/code-review
Review the codebase for task: [task description]
```

The code-review agent will:
- Analyze all modified files
- Identify bugs, security issues, and code quality problems
- Report specific issues with locations
- Loop back to code if issues found
- Approve and hand off to performance if no issues

### Step 3: Performance Agent

Code-review automatically invokes performance when approved. You can also invoke:

```
/performance
Analyze the codebase for performance improvements
```

The performance agent will:
- Identify bottlenecks and inefficiencies
- Document findings in `docs/performance/`
- Prioritize by impact vs effort
- Update team memory

## Memory System

All agents share a common memory file at `.claude/memory/team-memory.md` that tracks:
- What code has implemented
- What code-review has reviewed
- What performance has analyzed

Each agent is responsible for updating their section of the memory file after completing work.

## Agent Capabilities

### Code Agent
- Reads existing codebase
- Follows project conventions (CLAUDE.md)
- Implements features and fixes bugs
- Runs tests after changes
- Updates memory with work completed

### Code-Review Agent
- Verifies task implementation
- Finds bugs and security issues
- Checks code quality and style
- Provides specific fix recommendations
- Approves or requests fixes

### Performance Agent
- Analyzes algorithmic complexity
- Identifies I/O inefficiencies
- Finds memory issues
- Checks database operations
- Documents recommendations in `docs/performance/`

## Example Session

```
You: /code Implement user authentication

[Code agent implements authentication]

Code Agent: ✓ Authentication implemented. Files: src/auth.ts, src/config.ts
Code Agent: Invoking code-review...

[Code-review agent analyzes the code]

Code-Review Agent: Issue #1: Password not hashed (Critical)
Code-Review Agent: Issue #2: No rate limiting (High)
Code-Review Agent: Invoking code to fix issues...

[Code agent fixes the issues]

Code Agent: ✓ Issues fixed. Invoking code-review...

[Code-review agent approves]

Code-Review Agent: ✅ APPROVED. No issues found.
Code-Review Agent: Invoking performance agent...

[Performance agent analyzes]

Performance Agent: 2 recommendations documented in docs/performance/auth-analysis.md
Performance Agent: ✓ Analysis complete.
```

## Customization

To modify agent behavior:
1. Edit the corresponding `agent.md` file in each agent's directory
2. Modify the instructions, capabilities, or workflow as needed

To add more agents:
1. Create a new directory under `.claude/agents/`
2. Add an `agent.md` file with proper frontmatter
3. Define the agent's role and capabilities
