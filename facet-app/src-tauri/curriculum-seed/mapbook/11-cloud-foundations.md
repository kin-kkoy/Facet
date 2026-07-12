# Cloud & Azure Foundations

You can now build and deploy an API. The Cloud branch is about doing that **at scale, managed, and
professionally** on Azure — the platform most .NET shops use. This first chapter is orientation: the
vocabulary and the mental model, so the service names in later chapters aren't just noise. No Azure
account is strictly required to read it, but a free one makes the exercises real.

---

## 1. The cloud model — who manages what

"The cloud" is someone else's computers you rent, but the important axis is **how much they manage
for you**:

| Model | You manage | They manage | Example |
|---|---|---|---|
| **IaaS** (infrastructure) | OS, runtime, app | the hardware | a virtual machine |
| **PaaS** (platform) | just your app | OS, runtime, scaling | Azure App Service |
| **Serverless / FaaS** | just a function | everything, incl. when to run | Azure Functions |

The trend is **up that stack**: the less undifferentiated plumbing you babysit, the more you ship.
As a .NET developer you'll live mostly in **PaaS and serverless** — you hand Azure a container or a
function and it runs, scales, and heals it. **Mental model:** you're moving responsibility (and 3am
pages) *to Azure* in exchange for money and some lock-in.

> **Try it (thinking):** for your to-do API, which model fits — a VM you patch, an App Service you push
> a container to, or Functions per endpoint? Justify it in two sentences. (App Service or Container
> Apps is the usual sweet spot.)

---

## 2. How Azure is organized

Everything in Azure is a **resource** (a database, a web app, a storage account). Resources live in:

- a **subscription** — the billing boundary,
- a **resource group** — a folder that groups related resources for one app/environment, so you can
  deploy, tag, and *delete them together*,
- a **region** — the physical datacenter location (put resources that talk to each other in the same
  region to cut latency and egress cost).

You touch it three ways: the **Portal** (web UI, good for learning/poking), the **Azure CLI** (`az`,
good for scripting and repeatability), and **Infrastructure as Code** (Bicep — chapter 5, the real
professional way).

```bash
az group create --name todo-rg --location eastus
az resource list --resource-group todo-rg   # everything in that group
az group delete --name todo-rg               # tears down the whole app in one command
```

> **Try it (lab):** with a free account, create a resource group via the CLI, list it in the Portal,
> then delete it. That create→inspect→delete loop is 80% of day-to-day Azure.

---

## 3. Identity, access & cost — the grown-up concerns

- **Entra ID** (formerly Azure AD) is the identity system; **RBAC** (role-based access control)
  assigns *roles* (Reader, Contributor, Owner) to people/apps *scoped* to a subscription, group, or
  single resource. Grant the **least privilege** that works — a deploy pipeline needs Contributor on
  one resource group, not Owner on everything.
- **Managed identities** let your app authenticate to other Azure services **without storing any
  secret** — Azure vouches for the app's identity. This is the modern answer to "where do I put the
  database password?" (you don't; you use a managed identity).
- **Cost** is real money from minute one. Set a **budget + cost alert**, prefer consumption/serverless
  tiers while learning, and **delete resource groups when done**. The number-one cloud-beginner
  mistake is leaving a VM or database running and getting a surprise bill.

> **Try it (thinking):** list which secrets your deployed to-do API currently has (DB connection, JWT
> key). For each, decide whether a **managed identity** or **Key Vault** (chapter 4) could remove the
> secret from your config entirely.

---

## Cost / operations notes

- **Serverless & consumption tiers scale to (near) zero** — you pay per use, ideal for learning and
  spiky workloads; a fixed VM bills 24/7 whether used or not.
- **Same-region resources** avoid cross-region data-transfer charges and latency.
- **Tag resources** (`env=dev`, `app=todo`) so cost reports and cleanup are sane.
- **Resource-group-per-environment** (dev/prod) makes "delete the dev environment" a one-liner.

## Build it (make the chapter real)

Get oriented hands-on (all on the free tier):

1. Create a **resource group** for your to-do app via the `az` CLI.
2. In the Portal, set a **budget + cost alert** on your subscription.
3. Write down your app's **secrets** and which Azure feature (managed identity / Key Vault) will hold
   each once you're in the cloud.
4. Delete the resource group and confirm everything's gone.

Success test: you can create and destroy a scoped environment from the command line and you're not
scared of the bill. That confidence is the foundation the rest of the branch builds on.

*Cert note: the classic AZ-204 developer exam is being retired (2026) in favour of an AI-focused
successor (AI-200) — treat certs as a bonus checklist, not the goal; a deployed project proves more.*
