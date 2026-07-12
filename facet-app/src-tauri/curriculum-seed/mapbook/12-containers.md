# Containers

You met Docker in the Deployment chapter; here you go a level deeper, because **the container is the
unit the cloud deploys**. Every compute service in the next chapter takes a container image and runs
it. Get the image right — small, secure, reproducible — and the rest of the cloud is easy.

---

## 1. A production-grade .NET image

The multi-stage Dockerfile from Deployment is the base; the production version tightens three things —
size, security, and health:

```dockerfile
# --- build stage: the big SDK image, only used to compile ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore                 # restore first, in its own layer (cache-friendly)
COPY . .
RUN dotnet publish -c Release -o /app

# --- runtime stage: small aspnet image, no compiler ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
USER $APP_UID                      # run as non-root (built into the .NET images)
EXPOSE 8080
ENTRYPOINT ["dotnet", "TodoApi.dll"]
```

Three ideas that matter:

- **Layer caching:** copy the `.csproj` and `restore` *before* copying the source, so an unchanged
  dependency set reuses the cached restore layer — builds go from minutes to seconds.
- **Non-root** (`USER $APP_UID`): if the app is compromised, the attacker isn't root inside the
  container. Free security.
- **Small runtime base** (`aspnet`, not `sdk`): less to download, fewer CVEs. For even smaller, the
  `-alpine` or chiseled images strip the OS down further.

> **Try it (lab):** take your Deployment Dockerfile, split the restore into its own cached layer, add
> `USER $APP_UID`, and rebuild. Change one line of C# and rebuild again — notice the restore layer is
> cached and the build is fast.

---

## 2. Registries — where images live (ACR)

A built image has to live somewhere the cloud can pull it from: a **container registry**. Azure's is
**ACR (Azure Container Registry)**. The flow is build → tag → push → the compute service pulls:

```bash
az acr create --resource-group todo-rg --name todoregistry --sku Basic
az acr login --name todoregistry
docker tag todo-api todoregistry.azurecr.io/todo-api:v1   # name it for the registry
docker push todoregistry.azurecr.io/todo-api:v1
```

**Tags are versions.** `:v1`, `:v2`, or a git commit SHA — an immutable label for exactly this build.
The golden rule: **never deploy `:latest` to production.** `latest` is a moving target — you can't tell
which build is running or roll back cleanly. Tag with the version/commit so "what's live?" has an exact
answer.

Authentication to pull: a compute service uses a **managed identity** (from chapter 1) granted the
`AcrPull` role — no registry password stored anywhere. That's the pattern you'll see again and again.

> **Try it (lab):** create an ACR, push your image tagged `:v1`, then build a trivial change and push
> `:v2`. In the Portal, see both tags — that's your rollback history.

---

## Performance / cost notes

- **Smaller images = faster cold starts and deploys** — every compute service pulls the image before
  it can run; a 100 MB image beats a 700 MB one, especially for scale-to-zero services.
- **Order Dockerfile layers stalest→freshest** (deps before source) so caching works; a cache miss
  early invalidates everything after it.
- **Clean up old ACR tags** — stored images cost money; keep a retention policy or prune manually.
- **`.dockerignore`** (exclude `bin/`, `obj/`, `.git/`) keeps the build context small and fast.

## Build it (make the chapter real)

Get your to-do API into a registry, cloud-ready:

1. Harden the Dockerfile: cached `restore` layer, non-root user, small runtime base, `.dockerignore`.
2. Create an **ACR** and **push** the image tagged with a real version (`:v1`, not `:latest`).
3. Push a second version (`:v2`) so you have a rollback point.

Success test: your image is small (check `docker images`), runs as non-root, and sits in ACR with an
explicit version tag. It's now a deployable unit — the next chapter just points a compute service at
it.
