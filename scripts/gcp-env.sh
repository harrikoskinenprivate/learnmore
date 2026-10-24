# Yhteiset Cloud Run- ja Cloud SQL -oletukset.
# Deploy-skriptit lataavat tämän. Älä aja tiedostoa suoraan.
# Salaisuuksia ei ole tässä tiedostossa.

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "Tämä tiedosto vain ladataan deploy-skripteihin." >&2
  exit 1
fi

REGION="${REGION:-europe-north1}"
PROJECT_ID="${PROJECT_ID:-development-475808}"
REPOSITORY="${REPOSITORY:-cloud-run-source-deploy}"
IMAGE_NAME="${IMAGE_NAME:-oppimistehtavat}"
SERVICE="${SERVICE:-oppimistehtavat}"
# Olemassa oleva instanssi. Skripti ei luo eikä muuta instanssia.
SQL_INSTANCE="${SQL_INSTANCE:-hk-pgsql2}"
SQL_DATABASE="${SQL_DATABASE:-learnmore}"
SQL_USER="${SQL_USER:-oppimistehtavat}"
DATABASE_SECRET="${DATABASE_SECRET:-oppimistehtavat-database-url}"
GCS_BUCKET="${GCS_BUCKET:-${PROJECT_ID}-oppimistehtavat-media}"
DATABASE_POOL_MAX="${DATABASE_POOL_MAX:-5}"
SERVICE_MEMORY="${SERVICE_MEMORY:-1Gi}"
SERVICE_CPU="${SERVICE_CPU:-1}"
SERVICE_CONCURRENCY="${SERVICE_CONCURRENCY:-20}"
PROXY_PORT="${PROXY_PORT:-9470}"

REGISTRY_HOST="${REGION}-docker.pkg.dev"
INSTANCE_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
