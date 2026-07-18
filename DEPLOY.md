# Deploy — GitHub Actions → Google Cloud Run (`gradient-digital-group`)

Two services deploy to Cloud Run in region `asia-southeast1`:

| Service    | Source                          | What it is                                  |
| ---------- | ------------------------------- | ------------------------------------------- |
| `loma-api` | `loma-app/logging-api`          | FastAPI — events, `/providers`, `/ask` (Thai LLM) |
| `loma-web` | `LOMA_handoff-LASTEST/LOMA`     | nginx serving the built `LOMA.html`         |

**Pipeline** ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) — on push to `main` (or manual `workflow_dispatch`):

1. Deploy `loma-api`, read its public URL.
2. Build `LOMA.html` (runs the patchers via `build.sh`) and **bakes the API URL** into `window.LOMA_API_BASE`.
3. Deploy `loma-web`.

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every push/PR: compiles the API and verifies every inline `<script>` in the built `LOMA.html` parses. No cloud access.

---

## One-time setup

Run these once with the `gcloud` CLI (authenticated as an Owner/Editor of the project).

### 1. Enable APIs

```bash
gcloud config set project gradient-digital-group
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com
```

### 2. Secrets (Secret Manager)

The API reads these at runtime (values are in the repo-root, gitignored `.env`):

```bash
printf '%s' 'postgresql://…'   | gcloud secrets create loma-postgres-conn --data-file=-
printf '%s' '<THAILLM key>'    | gcloud secrets create loma-thaillm-key   --data-file=-
printf '%s' '<GEMINI key>'     | gcloud secrets create loma-gemini-key    --data-file=-
printf '%s' '<PLACES key>'     | gcloud secrets create loma-places-key    --data-file=-
```

Let the Cloud Run runtime service account read them:

```bash
PROJECT_NUMBER=$(gcloud projects describe gradient-digital-group --format='value(projectNumber)')
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
for s in loma-postgres-conn loma-thaillm-key loma-gemini-key loma-places-key; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor"
done
```

> To update a key later: `printf '%s' '<new>' | gcloud secrets versions add loma-thaillm-key --data-file=-`
> (the deploy uses `:latest`, so the next deploy picks it up).

### 3. Deployer service account

```bash
gcloud iam service-accounts create gh-deployer --display-name="GitHub Actions deployer"
DEPLOYER="gh-deployer@gradient-digital-group.iam.gserviceaccount.com"

for role in roles/run.admin roles/cloudbuild.builds.editor \
            roles/artifactregistry.writer roles/storage.admin \
            roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding gradient-digital-group \
    --member="serviceAccount:${DEPLOYER}" --role="$role"
done
```

### 4. Keyless auth — Workload Identity Federation

```bash
PROJECT_NUMBER=$(gcloud projects describe gradient-digital-group --format='value(projectNumber)')
REPO="ThanakritPaisal/phuket"   # owner/repo

gcloud iam workload-identity-pools create github-pool \
  --location=global --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global --workload-identity-pool=github-pool \
  --display-name="GitHub OIDC" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Let this repo impersonate the deployer SA.
gcloud iam service-accounts add-iam-policy-binding "gh-deployer@gradient-digital-group.iam.gserviceaccount.com" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${REPO}"

# The value for the GCP_WORKLOAD_IDENTITY_PROVIDER secret:
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
```

### 5. GitHub repository secrets

`Settings → Secrets and variables → Actions`:

| Secret                             | Value                                                             |
| ---------------------------------- | ---------------------------------------------------------------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER`   | the `projects/…/providers/github-provider` string from step 4    |
| `GCP_SERVICE_ACCOUNT`              | `gh-deployer@gradient-digital-group.iam.gserviceaccount.com`     |

> **Prefer a JSON key instead of WIF?** Create a key for the deployer SA, store it as a `GCP_SA_KEY` secret, and in `deploy.yml` replace the two `workload_identity_provider`/`service_account` inputs with `credentials_json: ${{ secrets.GCP_SA_KEY }}` (and you can drop `permissions: id-token: write`). WIF is recommended — no long-lived key to leak.

---

## First deploy

Push to `main`, or run **Actions → Deploy to Cloud Run → Run workflow**. When it finishes, the run summary prints both URLs.

## Seed the provider catalog (once, or after regenerating data)

`/providers` and `/ask` read the `provider` table. Seed it from the app's data:

```bash
cd loma-app/logging-api
# POSTGRESQL_CONNECTING_STRING must be set (it's in the repo-root .env)
python seed_providers.py
```

## Notes

- `LOMA_LOG_CORS` defaults to `*` (open for the demo). Set it to the `loma-web` URL to lock the API down.
- The web page calls the API at the baked `window.LOMA_API_BASE`; override at runtime with `?api=https://…` if needed.
- Both containers honour Cloud Run's `$PORT`; locally the API is `:8000` and the web is `:8080`.
