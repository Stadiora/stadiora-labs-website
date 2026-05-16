# Stadiora Labs — Azure-Native Platform Architecture

## Decision

Stadiora Labs should use an Azure-native architecture for the production platform.

Supabase/Auth0 should not be treated as the default direction because the current Stadiora/Aria infrastructure is already Azure-first. The product can still use static HTML prototypes for visual exploration, but the production authentication, API, database, and AI layers should align to Azure.

## Naming decision

The coaching application is now named **Aria for Coaches**.

Use this naming model consistently:

- **Stadiora Labs**: company / umbrella brand.
- **Aria**: athlete-facing app.
- **Aria for Coaches**: coach, academy, club, and institution-facing product.
- **Aria XI**: football/soccer intelligence layer inside the Aria ecosystem.
- **Aria Intelligence API**: shared decision engine and developer layer.

Do not use **Stadiora** as the product name for the coach app going forward. Existing files or URLs that contain `stadiora` may remain only as compatibility aliases until they can be safely redirected.

## Recommended Azure stack

### Frontend

Preferred options:

- Azure Static Web Apps for static or React/Next frontend experiences.
- Azure App Service if the frontend is served together with a backend app.
- Azure Front Door later for global edge, custom domains, routing, WAF, and performance.

### Identity and login

Use Microsoft Entra as the identity foundation.

Recommended options:

- Microsoft Entra External ID for external customers, athletes, coaches, academies, clubs, and institutions.
- Microsoft Entra ID for internal/admin users when needed.

The login model should capture:

- Institution or club
- Sport context
- Role
- Team or roster access
- Permission level

Example routing:

```text
User signs in
→ Institution resolved
→ Sport selected or assigned
→ Role selected or assigned
→ Workspace route
```

Current prototype workspace routes:

```text
/coaches-track.html
/coaches-soccer.html
```

Future app routes:

```text
/app/aria-for-coaches/track/dashboard
/app/aria-for-coaches/football/dashboard
/app/admin/institution
/app/athlete
```

### Backend API

Use Azure-hosted backend services:

- Azure App Service or Azure Container Apps for the API.
- Azure Functions for event-driven jobs and lightweight automations.
- API Management later if the Aria Intelligence API becomes externally consumed by partners or developers.

### Database

Recommended production data layer:

- Azure Database for PostgreSQL Flexible Server if the product needs relational data and PostgreSQL compatibility.
- Azure Cosmos DB if the product needs highly flexible document-style data, global distribution, or event-heavy user state.

Suggested first choice for Aria for Coaches:

```text
Azure Database for PostgreSQL Flexible Server
```

Reason:

- Institution/team/user relationships are relational.
- Sports data can be modeled cleanly with tables.
- PostgreSQL works well with analytics, reporting, and future AI workflows.

### Storage

Use Azure Storage accounts for:

- Video files
- Images
- Reports
- Exports
- Uploaded CSV/GPS files
- Athlete documents

### AI layer

Use Azure OpenAI and Azure AI Foundry for:

- Aria Intelligence recommendations
- Report generation
- Coach summaries
- Player explanations
- Return-to-play summaries
- Natural language Q&A over athlete/team context

### Observability

Use:

- Application Insights
- Log Analytics Workspace
- Azure Monitor alerts

## Product architecture principle

Use one shared platform foundation, but keep each sport as a separate product experience.

Shared foundation:

- Authentication
- Institution management
- Billing
- User profiles
- Role-based access
- Aria Intelligence API
- Notification services
- Reporting engine
- Design system

Separated by sport:

- Navigation
- Dashboard language
- Sport-specific metrics
- Decision logic
- Workflow modules
- Recommendation templates

## Sport separation inside Aria for Coaches

### Aria for Coaches Track

Primary question:

```text
What should each athlete do today based on their event, training phase, and readiness?
```

Core modules:

- Season planning
- Training groups
- Event-specific session builder
- Sprint readiness
- Individual development plans
- Competition calendar
- Aria athlete app sync

### Aria for Coaches Football / Aria XI

Primary question:

```text
Who is available today, who needs modification, and who needs attention before the next match?
```

Core modules:

- Availability Index
- Coach Attention Queue
- Return-to-Play Command Center
- Player Passport
- Match readiness
- Expected minutes
- Squad wellness

## MVP recommendation

Phase 1 should stay simple:

1. Institution login prototype
2. Sport selection
3. Role selection
4. Aria for Coaches Track portal
5. Aria for Coaches Football portal
6. Static mock data
7. Later connection to Azure authentication and Azure-hosted API

## Do not do yet

- Do not mix track and football into one generic coach dashboard.
- Do not introduce Supabase as the default architecture.
- Do not overbuild microservices before the first institutional pilots.
- Do not expose complex AI or metabolic scores directly to coaches or athletes.

## Recommended next implementation phase

Convert the static prototype into a real app using:

```text
React or Next.js frontend
Azure Static Web Apps or Azure App Service hosting
Microsoft Entra External ID authentication
Azure Database for PostgreSQL Flexible Server
Azure OpenAI / Azure AI Foundry
Azure Storage
Application Insights
```
