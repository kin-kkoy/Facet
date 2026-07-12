# Deployment

An API on your laptop helps no one. **Deployment** is the leap from "it runs on my machine" to "it's
live on the internet, survives restarts, and I can tell when it breaks." This is the chapter that
turns a project into a portfolio piece with a URL you can put on a résumé.

---

## 1. Docker — package the app with its world

A **container** bundles your app *and* everything it needs (the .NET runtime, files, config) into one
image that runs identically anywhere. It solves "works on my machine" by shipping the machine. A
.NET **Dockerfile** uses a multi-stage build — a big SDK image to compile, a small runtime image to
run:

```dockerfile
# build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app

# runtime stage — small, no SDK
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "YourApi.dll"]
```

```
docker build -t todo-api .
docker run -p 8080:8080 todo-api
```

**Mental model:** the image is a frozen, runnable snapshot; a container is a running instance of it.
Multi-stage keeps the final image small (no compiler shipped to production) — smaller images deploy
faster and have less attack surface.

> **Try it (lab):** write the Dockerfile for your to-do API, build it, and `docker run` it locally.
> Hit the endpoints on `localhost:8080` — same app, now in a container.

---

## 2. CI/CD — build, test, deploy automatically

**CI (continuous integration)** runs your build + tests on every push; **CD (continuous delivery)**
then ships the result. A **GitHub Actions** workflow is a YAML file describing the steps:

```yaml
name: ci
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '10.0.x' }
      - run: dotnet test          # fail the build if any test fails
      - run: dotnet publish -c Release
      # ...then build the image and push/deploy it
```

The payoff: **broken code never reaches production** because the pipeline catches it, and deploys stop
being a scary manual ritual. Every merge to `main` can automatically test and release.

> **Try it (lab):** add a workflow that runs `dotnet test` on push. Push a change that breaks a test
> and watch the red X — then fix it and watch it go green. That feedback loop is the whole point of CI.

---

## 3. Hosting, HTTPS & the public internet

To be reachable, your container needs a **host** (a cloud service that runs it and gives it a public
address) and **HTTPS** (a TLS certificate so traffic is encrypted). Options range from
platform-as-a-service (push a container, it runs) to full orchestration. Whatever the host, the
essentials are the same:

- a **public URL** with a valid **TLS certificate** (managed certs make this a checkbox now),
- **configuration via environment variables** (connection strings, JWT keys) — the same config system
  from the ASP.NET chapter, sourced from the host instead of a file,
- a **managed database** the app connects to (don't run your DB in the same throwaway container).

The Cloud branch of this curriculum goes deep on Azure specifics; here the goal is just: *your API is
publicly reachable over HTTPS, configured through the environment.*

---

## 4. Monitoring — know when it breaks

Once it's live, you need eyes on it:

- **Health checks** — a `GET /health` endpoint the host pings to know the app is alive (ASP.NET has
  `AddHealthChecks()`), so it can restart a dead instance.
- **Structured logs** (from the ASP.NET chapter) shipped somewhere you can search them.
- **Metrics** — request rate, error rate, latency — so "is it slow?" has an answer that isn't a guess.

The rule: if you can't *see* production, you're flying blind. A health check + searchable logs is the
minimum that separates "a deployed app" from "a deployed app you can operate."

## Performance / operations notes

- **`-c Release`** builds with optimizations on — never deploy a Debug build.
- **Small runtime images** (aspnet, not sdk) deploy faster and are more secure.
- **Externalize state**: the container should be disposable; data lives in the managed database, files
  in blob/object storage — so the host can restart or scale instances freely.
- **Set resource limits + health checks** so a wedged instance gets recycled instead of silently
  rotting.

## Build it (make the chapter real)

Put your data-backed to-do API **on the internet**:

1. A multi-stage **Dockerfile**; build and run it locally to confirm it works containerized.
2. A **GitHub Actions** workflow that runs `dotnet test` on every push (and, ideally, builds the image).
3. Deploy the container to a host with a **public HTTPS URL**, its config in **environment variables**,
   pointing at a **managed database**.
4. A `GET /health` endpoint and logs you can read from the host.

Success test: a stranger can hit your HTTPS URL, the data persists across a container restart, and a
failing test blocks the pipeline. That URL is the single most convincing line on a junior résumé.
