# AI Knowledge Base

This directory serves as the central repository for AI assistants working on the Political Sphere project. It contains essential context, knowledge, and guidelines that AIs should reference for effective collaboration.

## Contents

### project-context.md
Comprehensive overview of the Political Sphere project including:
- Project goals and architecture
- Key components and technologies
- Development practices and standards
- AI integration guidelines
- Governance rules and ethical considerations

### knowledge-base.json
Structured knowledge base containing:
- Project-specific terminology and concepts
- Common patterns and best practices
- Troubleshooting guides
- Integration points and APIs

### semantic-index.json
Semantic indexing for AI understanding:
- Concept relationships and mappings
- Contextual embeddings
- Knowledge graph connections

## Usage Guidelines

### For AI Assistants:
1. **Always read project-context.md first** when starting work on this project
2. **Reference knowledge-base.json** for project-specific information
3. **Consult the service quick references** (`api-service.md`, `game-server.md`, `frontend.md`) for focused guidance
4. **Use semantic-index.json** for understanding relationships between concepts
5. **Log significant interactions** in the appropriate history files
6. **Follow governance rules** outlined in ai/governance/.blackboxrules and GitHub Copilot instructions

### Maintenance:
- Update project-context.md when major architectural changes occur
- Add new knowledge entries to knowledge-base.json as needed
- Keep semantic-index.json synchronized with knowledge-base.json
- Review and update content quarterly or after major releases

## Integration Points

This knowledge base integrates with:
- `.blackboxrules` in ai/governance/ for AI behavior guidelines
- `ai/patterns/` for reusable code patterns
- `ai/prompts/` for specialized AI prompts
- `docs/` for comprehensive project documentation

## Contact

For questions about AI knowledge base maintenance or additions, refer to the project governance rules or create an issue in the repository.
