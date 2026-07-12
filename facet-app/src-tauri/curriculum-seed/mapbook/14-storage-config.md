# Storage & Config

Your relational database (EF Core) handles structured app data. But real cloud apps need more: a place
for **files**, sometimes a **NoSQL** store, a safe home for **secrets**, and a way for services to talk
without blocking on each other. This chapter is the supporting cast around your database.

---

## 1. Blob Storage — files at scale

**Azure Blob Storage** holds unstructured objects — images, uploads, exports, backups — cheaply and at
huge scale. You don't put files in your SQL database; you put a **URL** to the blob in the database and
the bytes in Blob Storage.

```csharp
using Azure.Storage.Blobs;

var container = new BlobServiceClient(conn).GetBlobContainerClient("avatars");
await container.CreateIfNotExistsAsync();
await container.UploadBlobAsync("user-42.png", fileStream);   // store the bytes
// then save "avatars/user-42.png" as a string column in your DB
```

**Use-case:** a user uploads a profile picture — the image goes to Blob, the path goes to the `Users`
table. Serve blobs directly (or via a CDN) so your API isn't a file pipe. **Rule:** databases are for
queryable structured data; blobs are for bytes.

> **Try it (lab):** upload a file to a blob container from a tiny console app, then download it back.
> Note that the bytes never touched your SQL database.

---

## 2. Cosmos DB — NoSQL when the shape doesn't fit rows

**Cosmos DB** is Azure's globally-distributed NoSQL store — schema-flexible JSON documents, single-digit
millisecond reads, massive scale. Reach for it when your data is document-shaped, needs global
low-latency, or the schema varies per item — *not* as a default replacement for a relational database.

```csharp
using Microsoft.Azure.Cosmos;

var container = new CosmosClient(conn).GetContainer("app", "events");
await container.CreateItemAsync(new { id = "e1", type = "login", userId = 42 });
```

**The key design decision is the partition key** — Cosmos spreads data across partitions by it, so pick
a key that spreads load evenly and matches how you query (e.g. `userId`). A bad partition key is the
main way Cosmos gets slow and expensive. **Relational vs Cosmos:** use your SQL database for related,
transactional, queried-many-ways data; use Cosmos for high-scale, document-shaped, key-access data.

---

## 3. Key Vault — stop putting secrets in config

Back in Auth you had a JWT signing key and a DB password. Committing those is a classic breach.
**Azure Key Vault** stores secrets/keys/certs securely, and your app reads them at startup using its
**managed identity** — so there's **no secret in your config at all**, just a vault reference.

```csharp
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

var vault = new SecretClient(new Uri("https://todo-kv.vault.azure.net/"), new DefaultAzureCredential());
string dbPassword = (await vault.GetSecretAsync("Db-Password")).Value.Value;
```

`DefaultAzureCredential` uses the app's **managed identity** in Azure (and your dev login locally) — no
password to store the password. This closes the loop from chapter 1: *secrets live in Key Vault,
access is via identity, nothing sensitive is in git or app settings.*

> **Try it (thinking):** list every secret your to-do API has. For each, write the Key Vault secret
> name it would become, and confirm your app would then have **zero** secrets in its config file.

---

## 4. Messaging — decouple services

When one service shouldn't block on another (place an order → send an email), you put a **message on a
queue** and let a worker process it later. **Azure Service Bus** (rich, ordered, transactional) and
**Storage Queues** (simple, cheap) both do this.

```csharp
await sender.SendMessageAsync(new ServiceBusMessage(todoId));   // producer returns immediately
// a separate worker/Function consumes "todo-created" and does the slow work
```

**Use-case:** the API responds fast (just enqueues), while notifications, exports, or thumbnails happen
asynchronously in a worker. This is the async/await decoupling from the Core branch, but *across
services* — and it makes the system resilient (if the worker is down, messages wait in the queue).

## Performance / cost notes

- **Right store for the job:** SQL for relational/transactional, Cosmos for scale/document, Blob for
  bytes. Forcing one to do another's job is the expensive mistake.
- **Cosmos is billed by throughput (RU/s)** — a bad partition key or unindexed query burns RUs; model
  for your access pattern.
- **Serve blobs via CDN** for hot files instead of proxying them through your API.
- **Queues add resilience + smooth load spikes** — a burst of work backs up in the queue instead of
  overwhelming a downstream service.

## Build it (make the chapter real)

Give your to-do API a supporting cast:

1. **Blob:** let a todo have an attachment — upload the file to Blob, store its path in the DB.
2. **Key Vault:** move your DB connection string and JWT key into Key Vault; read them at startup via
   `DefaultAzureCredential`. Confirm your config now holds **no secrets**.
3. **Queue (stretch):** on todo-created, enqueue a message and have a Function log it — the API returns
   before the "notification" runs.

Success test: files live in Blob (not the database), your app starts with zero secrets in config, and
one action happens asynchronously via a queue. That's the shape of a real cloud application.
