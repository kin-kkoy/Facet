# Azure Compute

You have a container in a registry. This chapter is about **running it** — the three ways Azure hosts
your code, and how to pick. They overlap, so the skill isn't memorizing features; it's matching the
service to the workload.

---

## 1. App Service — the easy PaaS default

**Azure App Service** runs a web app or API for you: you point it at your container (or push code) and
it handles the OS, the web server, TLS certificates, scaling, and deployment slots. It's the
lowest-friction way to get a .NET API online.

```bash
az webapp create --resource-group todo-rg --plan todo-plan --name todo-api \
   --deployment-container-image-name todoregistry.azurecr.io/todo-api:v1
az webapp config appsettings set --name todo-api --resource-group todo-rg \
   --settings ConnectionStrings__Db="..." Jwt__Key="..."   # config via env vars
```

Two features you'll use constantly:

- **Deployment slots** — a "staging" slot you deploy to, warm up, smoke-test, then **swap** into
  production instantly (and swap back if it's bad). Zero-downtime deploys and instant rollback.
- **App settings** = environment variables — the same `IConfiguration` your ASP.NET app reads, sourced
  from Azure instead of `appsettings.json`. Note the `__` (double underscore) maps to the `:` nesting
  in config (`ConnectionStrings__Db` → `ConnectionStrings:Db`).

**Use it when:** you have a normal long-running web API and want minimal fuss. It's the right default
for your to-do app.

> **Try it (lab):** deploy your `:v1` image to an App Service, set the connection string + JWT key as
> app settings, and hit the public URL. Then push `:v2` to a staging slot and swap it in.

---

## 2. Azure Functions — serverless, event-driven

**Functions** run a single method **in response to an event** — an HTTP request, a queue message, a
timer, a blob upload — and you pay only while it runs (scale to zero when idle). No server to manage;
Azure decides when and how many to run.

```csharp
public class NotifyFunction
{
    [Function("OnTodoCreated")]                    // triggered by a queue message
    public void Run([QueueTrigger("todo-created")] string todoId, FunctionContext ctx)
        => ctx.GetLogger("Notify").LogInformation("New todo {Id}", todoId);
}
```

**Triggers** start a function; **bindings** wire inputs/outputs (a queue, a blob, a database) with
almost no plumbing. **Use it when:** work is bursty, event-driven, or scheduled — a webhook handler, a
nightly cleanup, "when a file lands, process it." **Don't** use it for a chatty, always-on API with a
big warm cache (cold starts + per-invocation model fight you there).

> **Try it (lab):** write a timer-triggered function that logs "tick" every minute, and an
> HTTP-triggered one that echoes its query string. Watch it scale to zero between runs (no cost while
> idle).

---

## 3. Container Apps — managed containers that scale to zero

**Azure Container Apps** is the middle ground: run your container with **automatic scaling (including
to zero)**, ingress/TLS, and revisions, without managing Kubernetes. It's serverless *for containers* —
more control than App Service, far less complexity than raw AKS (Kubernetes).

**Use it when:** you have containerized microservices, want scale-to-zero for cost, need background
workers alongside HTTP, or expect to grow into multiple services. It's a great home for a container
you already built in the last chapter.

## Choosing (the whole point)

| Want… | Pick |
|---|---|
| a normal always-on web API, least fuss | **App Service** |
| event/timer/queue-driven, pay-per-run, scale to zero | **Functions** |
| containers with autoscaling + scale-to-zero, room to grow | **Container Apps** |
| full Kubernetes control (rarely, as a junior) | AKS |

There's no single right answer — for your to-do API, App Service or Container Apps both work; the
exercise is being able to *justify* the choice.

## Performance / cost notes

- **Scale to zero** (Functions, Container Apps) saves money when idle but adds **cold-start latency** on
  the first request after idle — fine for background/bursty work, noticeable for a user-facing API
  (keep one instance warm if latency matters).
- **Right-size the plan/tier** — don't run a premium App Service plan for a demo; scale up only under
  real load.
- **Autoscale rules** (CPU, request count, queue depth) beat guessing a fixed instance count.

## Build it (make the chapter real)

Run your containerized to-do API on Azure, then compare:

1. Deploy the image to an **App Service** with config as app settings and a **staging slot** you swap.
2. Deploy the *same* image to **Container Apps** and enable scale-to-zero.
3. Add one **Function** for a genuinely event-driven job (e.g. a nightly "purge completed todos" timer).
4. Write one paragraph justifying which host you'd keep for production and why.

Success test: your API answers on a public Azure URL from at least one host, config comes from the
environment, and you can articulate the trade-offs between the three. Deploying a container to Azure
compute cold is exactly the Cloud checkpoint.
