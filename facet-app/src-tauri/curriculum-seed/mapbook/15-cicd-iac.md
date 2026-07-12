# CI/CD & IaC

So far you've clicked and typed `az` commands to set up Azure. That doesn't scale and isn't
repeatable. This chapter is about **automation** — the pipeline that builds and deploys on every push,
the code that defines your infrastructure, and the monitoring that tells you it's healthy. This is what
separates "I deployed once by hand" from "I run a service."

---

## 1. GitHub Actions → Azure (automated deploys)

You built a CI workflow in the Deployment chapter. Now extend it to **deploy to Azure** on merge to
`main`: build the image, push to ACR, tell the compute service to run the new tag.

```yaml
name: deploy
on: { push: { branches: [main] } }
permissions: { id-token: write, contents: read }   # for OIDC login (no stored password)
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2                 # OIDC federated login — no secret in the repo
        with: { client-id: ${{ vars.AZURE_CLIENT_ID }}, tenant-id: ${{ vars.AZURE_TENANT_ID }}, subscription-id: ${{ vars.AZURE_SUB }} }
      - run: az acr build -r todoregistry -t todo-api:${{ github.sha }} .    # build+push in ACR
      - run: az webapp config container set --name todo-api --resource-group todo-rg --container-image-name todoregistry.azurecr.io/todo-api:${{ github.sha }}
```

Two professional habits here:

- **OIDC federated login** (`azure/login` with `id-token`): the pipeline proves its identity to Azure
  with a short-lived token — **no long-lived secret stored in GitHub**. This is the modern, secure way;
  don't paste a service-principal password into repo secrets.
- **Tag with the commit SHA** (`${{ github.sha }}`): every deploy is traceable to an exact commit, and
  rollback is "point the service at the previous SHA."

> **Try it (lab):** add a deploy job that, on push to `main`, builds your image tagged with the commit
> SHA and updates your App Service to run it. Push a change and watch it go live untouched by human
> hands.

---

## 2. Infrastructure as Code (Bicep)

Clicking in the Portal isn't repeatable — you can't code-review a click, and you can't recreate the
exact environment. **Bicep** describes your Azure resources as *code* you commit, review, and deploy;
running it creates/updates exactly what it declares (idempotent — run it twice, same result).

```bicep
param location string = resourceGroup().location

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'todo-plan'
  location: location
  sku: { name: 'B1' }
}

resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: 'todo-api'
  location: location
  properties: { serverFarmId: plan.id }
}
```

```bash
az deployment group create --resource-group todo-rg --template-file main.bicep
```

**Why it matters:** your whole environment (app, database, storage, vault) becomes reproducible from a
file. Spin up an identical *staging* environment with one command; recover from disaster by
redeploying; review infra changes in a PR like any other code. Manual Portal setup is fine for
learning; IaC is how real teams operate.

> **Try it (lab):** write a Bicep file for an App Service plan + web app, deploy it, then delete the
> resource group and redeploy from the same file. Getting the identical environment back from code is
> the whole point.

---

## 3. Monitoring — Application Insights

A deployed service you can't observe is a liability. **Application Insights** (part of Azure Monitor)
auto-collects request rates, response times, failures, dependencies, and your structured logs, with
almost no code — usually one line to wire up. Then you can answer "is it up? is it slow? what's
erroring?" with dashboards and alerts instead of guesses.

- **Alerts** page you when error rate or latency crosses a threshold — *before* users complain.
- **Live metrics + logs** turn "it feels slow" into "the DB call on `/todos` is p95 800ms."
- **Distributed tracing** follows one request across services (API → queue → worker).

The rule from Deployment, now with teeth: **if you can't see production, you're not operating it.**

## Performance / operations notes

- **Idempotent IaC** means re-running is safe — deploy the same Bicep on every release to keep infra in
  sync with the app.
- **Environments as code**: parameterize Bicep (`param env string`) to spin dev/staging/prod from one
  template with different sizes.
- **Sample telemetry** under high load so App Insights costs stay sane while keeping signal.
- **Fail the pipeline on test failure** *before* the deploy step — never ship red.

## Build it (make the chapter real)

Make your to-do app fully automated and observed:

1. A **GitHub Actions** deploy workflow using **OIDC** (no stored secret) that builds, pushes to ACR,
   and updates your compute service on push to `main`, tagged by commit SHA.
2. A **Bicep** file defining your app's core infrastructure; deploy the environment from it.
3. **Application Insights** wired in, with one **alert** on error rate.

Success test: pushing to `main` deploys automatically, you can recreate the environment from Bicep, and
an induced error trips your alert. Standing up an environment via IaC + pipeline, cold, is the Cloud
checkpoint.
