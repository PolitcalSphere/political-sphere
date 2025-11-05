# Developer Onboarding Guide

<div align="center">

| Classification | Version | Last Updated |       Owner        | Review Cycle |  Status   |
| :------------: | :-----: | :----------: | :----------------: | :----------: | :-------: |
|  🔒 Internal   | `0.1.0` |  2025-10-30  | Documentation Team |  Quarterly   | **Draft** |

</div>

---

Welcome to the Political Sphere project! This guide will help you get started with the development environment and understand the project structure.

## 🚀 Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd political-sphere
   ```

2. **Run the setup script**

   ```bash
   ./scripts/setup.sh
   ```

   This script will:
   - Install dependencies
   - Set up environment variables
   - Initialize Terraform for local AWS services
   - Start all development services with Docker Compose
   - Run initial tests

3. **Open the application**
   - Frontend: http://localhost:3000
   - API Documentation: http://localhost:4000/docs
   - Keycloak Admin: http://localhost:8080 (admin/admin123)
   - Grafana: http://localhost:3001 (admin/admin123)

## 📁 Project Structure

```
political-sphere/
├── apps/                          # Applications
│   ├── dev/                       # Development environment
│   │   ├── ai/                    # AI assistants and tools
│   │   ├── docker/                # Docker configurations
│   │   ├── monitoring/            # Prometheus/Grafana configs
│   │   └── terraform/             # Local infrastructure as code
│   └── docs/                      # Documentation site
├── libs/                          # Shared libraries
│   ├── ci/                        # CI/CD configurations
│   ├── infrastructure/            # Production infrastructure
│   └── platform/                  # Platform services
├── scripts/                       # Utility scripts
├── docs/                          # Documentation
└── tools/                         # Development tools
```

## 🛠️ Development Workflow

### Daily Development

1. **Start the environment**

   ```bash
   cd apps/dev/docker
   docker-compose -f docker-compose.dev.yaml up -d
   ```

2. **Run tests**

   ```bash
   npm run test
   npm run test:e2e
   ```

3. **Lint and format code**

   ```bash
   npm run lint
   npm run format
   ```

4. **Build for production**
   ```bash
   npx nx build <project-name>
   ```

### Using Nx

This project uses Nx for monorepo management:

```bash
# Run a specific target for all projects
npx nx run-many --target=build

# Run a target for a specific project
npx nx run dev:build

# View dependency graph
npx nx graph
```

## 🔧 Available Services

| Service    | URL                   | Purpose                        |
| ---------- | --------------------- | ------------------------------ |
| Frontend   | http://localhost:3000 | React application              |
| API        | http://localhost:4000 | GraphQL/REST API               |
| Keycloak   | http://localhost:8080 | Identity and access management |
| PostgreSQL | localhost:5432        | Primary database               |
| Redis      | localhost:6379        | Caching and sessions           |
| LocalStack | localhost:4566        | AWS services emulation         |
| Prometheus | http://localhost:9090 | Metrics collection             |
| Grafana    | http://localhost:3001 | Monitoring dashboards          |
| MailHog    | http://localhost:8025 | Email testing                  |
| pgAdmin    | http://localhost:5050 | Database administration        |

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### End-to-End Tests

```bash
npm run test:e2e
```

### Performance Testing

```bash
npm run test:performance
```

## 📊 Monitoring

The development environment includes comprehensive monitoring:

- **Prometheus**: Metrics collection from all services
- **Grafana**: Dashboards for system and application metrics
- **Node Exporter**: System-level metrics

Access Grafana at http://localhost:3001 with admin/admin123.

## 🔒 Security

- All services run in isolated Docker containers
- Secrets are managed through environment variables
- LocalStack provides AWS service emulation
- Keycloak handles authentication and authorization

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Submit a pull request
5. Wait for CI/CD pipeline to pass

### Code Standards

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write comprehensive tests
- Update documentation for API changes

## 📚 Additional Resources

- [Architecture Overview](./architecture.md)
- [API Documentation](./api.md)
- [Deployment Guide](./deployment.md)
- [Troubleshooting](./troubleshooting.md)

## 🆘 Getting Help

- Check the [troubleshooting guide](./troubleshooting.md)
- Review existing issues on GitHub
- Ask questions in the development Slack channel
- Contact the tech lead for architectural questions

## 🎯 Next Steps

After completing this onboarding:

1. Explore the codebase and understand the domain
2. Set up your IDE with the recommended extensions
3. Review the current sprint goals
4. Start working on your first task

Welcome aboard! 🚀
