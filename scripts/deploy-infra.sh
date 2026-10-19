#!/usr/bin/env bash
# Cloud SQL, Secret Manager ja Cloud Run -asetukset.
# Tätä ei ajeta, kun julkaistaan pelkkä uusi ohjelmaversio.
# Katso komennot: ./scripts/deploy-infra.sh

set -euo pipefail

if [[ $- == *x* ]]; then
  echo "Skriptiä ei ajeta jäljitystilassa, jotta salaisuudet eivät päädy lokiin." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=gcp-env.sh
source "${SCRIPT_DIR}/gcp-env.sh"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

die() {
  echo "$1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Komento puuttuu: $1"
}

usage() {
  cat <<'EOF'
Käyttö: ./scripts/deploy-infra.sh <komento>

Komentoja ei ajeta sovellusversion julkaisussa. Aja vain se komento, jonka kohde muuttuu.

  registry   Artifact Registry -docker-repo, jos se puuttuu.
  sql        Cloud SQL -instanssi, tietokanta ja käyttäjä sekä DATABASE_URL-secret, jos ne puuttuvat.
             Ei vaihda olemassa olevaa salasanaa eikä secretin arvoa.
  secrets    Vaihtaa tietokannan salasanan ja kirjoittaa uuden secret-version.
             Vaatii ympäristömuuttujan DB_PASSWORD. Ei päivitä Cloud Runia.
  bucket     Yksityinen Cloud Storage -bucket kuville ja ohjevideolle, jos se puuttuu.
             Asettaa CORS-säännön. Ei päivitä Cloud Run -kuvaa.
  config     Liittää olemassa olevaan Cloud Run -palveluun Cloud SQL -yhteyden,
             DATABASE_URL-secretin ja muuttujan DATABASE_POOL_MAX.
             Jos bucket on olemassa, lisää MEDIA_STORE=gcs ja GCS_BUCKET.
             Ei rakenna kuvaa eikä aja migraatiota.
  migrate    Ajaa tietokantamigraatiot Cloud SQL Auth Proxyn kautta.
             Ei luo opettajaa.
  seed       Luo ensimmäisen opettajan, jos kannassa ei ole opettajaa.
             Vaatii TEACHER_NAME, TEACHER_EMAIL ja TEACHER_PASSWORD.
             Ei lue sovellus/.env-tiedostoa eikä vaihda olemassa olevaa opettajaa.

Versiojulkaisu: ./scripts/deploy-hosting.sh
EOF
}

secret_exists() {
  gcloud secrets describe "${DATABASE_SECRET}" --project="${PROJECT_ID}" >/dev/null 2>&1
}

instance_exists() {
  gcloud sql instances describe "${SQL_INSTANCE}" --project="${PROJECT_ID}" >/dev/null 2>&1
}

database_exists() {
  gcloud sql databases describe "${SQL_DATABASE}" \
    --instance="${SQL_INSTANCE}" \
    --project="${PROJECT_ID}" >/dev/null 2>&1
}

sql_user_exists() {
  gcloud sql users list \
    --instance="${SQL_INSTANCE}" \
    --project="${PROJECT_ID}" \
    --format='value(name)' | grep -qx "${SQL_USER}"
}

service_exists() {
  gcloud run services describe "${SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" >/dev/null 2>&1
}

build_socket_url() {
  DB_USER="${SQL_USER}" \
  DB_NAME="${SQL_DATABASE}" \
  DB_PASSWORD="${DB_PASSWORD}" \
  INSTANCE_CONNECTION="${INSTANCE_CONNECTION}" \
  python3 -c 'import os; from urllib.parse import quote; user=os.environ["DB_USER"]; password=os.environ["DB_PASSWORD"]; database=os.environ["DB_NAME"]; instance=os.environ["INSTANCE_CONNECTION"];
assert password, "DB_PASSWORD puuttuu.";
print("postgresql://%s:%s@/%s?host=/cloudsql/%s" % (quote(user, safe=""), quote(password, safe=""), quote(database, safe=""), instance), end="")'
}

write_secret() {
  local url="$1"
  if secret_exists; then
    printf '%s' "${url}" | gcloud secrets versions add "${DATABASE_SECRET}" \
      --project="${PROJECT_ID}" \
      --data-file=-
  else
    printf '%s' "${url}" | gcloud secrets create "${DATABASE_SECRET}" \
      --project="${PROJECT_ID}" \
      --replication-policy=automatic \
      --data-file=-
  fi
}

cmd_registry() {
  require_cmd gcloud
  gcloud services enable artifactregistry.googleapis.com --project="${PROJECT_ID}"
  if gcloud artifacts repositories describe "${REPOSITORY}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "Artifact Registry -repo on jo olemassa: ${REPOSITORY}"
    return
  fi
  gcloud artifacts repositories create "${REPOSITORY}" \
    --repository-format=docker \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --description="Oppimistehtavat Cloud Run images"
  echo "Luotiin Artifact Registry -repo: ${REPOSITORY}"
}

cmd_sql() {
  require_cmd gcloud
  require_cmd openssl
  require_cmd python3
  gcloud services enable sqladmin.googleapis.com secretmanager.googleapis.com --project="${PROJECT_ID}"

  if ! instance_exists; then
    echo "Luodaan Cloud SQL -instanssi ${SQL_INSTANCE} alueelle ${REGION}. Tämä voi kestää useita minuutteja."
    gcloud sql instances create "${SQL_INSTANCE}" \
      --project="${PROJECT_ID}" \
      --database-version=POSTGRES_16 \
      --edition=enterprise \
      --tier="${SQL_TIER}" \
      --region="${REGION}" \
      --availability-type=zonal \
      --storage-type=SSD \
      --storage-size=10 \
      --quiet
  else
    echo "Cloud SQL -instanssi on jo olemassa: ${SQL_INSTANCE}"
  fi

  if ! database_exists; then
    gcloud sql databases create "${SQL_DATABASE}" \
      --instance="${SQL_INSTANCE}" \
      --project="${PROJECT_ID}"
    echo "Luotiin tietokanta: ${SQL_DATABASE}"
  else
    echo "Tietokanta on jo olemassa: ${SQL_DATABASE}"
  fi

  local user_exists=0
  local secret_ok=0
  if sql_user_exists; then
    user_exists=1
  fi
  if secret_exists; then
    secret_ok=1
  fi

  if [[ "${user_exists}" -eq 1 && "${secret_ok}" -eq 1 ]]; then
    echo "Käyttäjä ja DATABASE_URL-secret ovat jo olemassa. Salasanaa ei vaihdettu."
    return
  fi
  if [[ "${user_exists}" -eq 1 && "${secret_ok}" -eq 0 ]]; then
    die "Käyttäjä on olemassa, mutta secretiä ei ole. Aja ./scripts/deploy-infra.sh secrets ja anna nykyinen salasana muuttujassa DB_PASSWORD."
  fi
  if [[ "${user_exists}" -eq 0 && "${secret_ok}" -eq 1 ]]; then
    die "Secret on olemassa, mutta tietokantakäyttäjää ei ole. Käyttäjää ei luoda uudella salasanalla, koska se ei vastaisi secretiä."
  fi

  local DB_PASSWORD
  DB_PASSWORD="$(openssl rand -base64 32 | tr -d '\n' | tr '/+=' 'xyz')"
  gcloud sql users create "${SQL_USER}" \
    --instance="${SQL_INSTANCE}" \
    --project="${PROJECT_ID}" \
    --password="${DB_PASSWORD}"
  local url
  url="$(build_socket_url)"
  write_secret "${url}"
  unset DB_PASSWORD url
  echo "Luotiin tietokantakäyttäjä ja DATABASE_URL-secret. Salasanaa ei tulosteta."
}

cmd_secrets() {
  require_cmd gcloud
  require_cmd python3
  if [[ -z "${DB_PASSWORD:-}" || ${#DB_PASSWORD} -lt 8 ]]; then
    die "Aseta DB_PASSWORD (vähintään 8 merkkiä). Arvoa ei tulosteta."
  fi
  gcloud services enable sqladmin.googleapis.com secretmanager.googleapis.com --project="${PROJECT_ID}"
  instance_exists || die "Cloud SQL -instanssi puuttuu. Aja ensin: ./scripts/deploy-infra.sh sql"
  database_exists || die "Tietokanta puuttuu. Aja ensin: ./scripts/deploy-infra.sh sql"

  if sql_user_exists; then
    gcloud sql users set-password "${SQL_USER}" \
      --instance="${SQL_INSTANCE}" \
      --project="${PROJECT_ID}" \
      --password="${DB_PASSWORD}"
  else
    gcloud sql users create "${SQL_USER}" \
      --instance="${SQL_INSTANCE}" \
      --project="${PROJECT_ID}" \
      --password="${DB_PASSWORD}"
  fi

  local url
  url="$(build_socket_url)"
  write_secret "${url}"
  unset url
  echo "Secret-versio kirjoitettiin. Cloud Runia ei päivitetty."
  echo "Ota uusi versio käyttöön: ./scripts/deploy-infra.sh config"
}

runtime_service_account() {
  local configured
  configured="$(gcloud run services describe "${SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --format='value(spec.template.spec.serviceAccountName)')"
  if [[ -n "${configured}" ]]; then
    printf '%s' "${configured}"
    return
  fi
  local project_number
  project_number="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  printf '%s-compute@developer.gserviceaccount.com' "${project_number}"
}

bucket_exists() {
  gcloud storage buckets describe "gs://${GCS_BUCKET}" --project="${PROJECT_ID}" >/dev/null 2>&1
}

grant_media_access() {
  local runtime_sa="$1"
  gcloud storage buckets add-iam-policy-binding "gs://${GCS_BUCKET}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${runtime_sa}" \
    --role="roles/storage.objectAdmin" \
    --quiet >/dev/null
  gcloud iam service-accounts add-iam-policy-binding "${runtime_sa}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${runtime_sa}" \
    --role="roles/iam.serviceAccountTokenCreator" \
    --quiet >/dev/null
}

cmd_bucket() {
  require_cmd gcloud
  gcloud services enable storage.googleapis.com --project="${PROJECT_ID}"
  if ! bucket_exists; then
    gcloud storage buckets create "gs://${GCS_BUCKET}" \
      --project="${PROJECT_ID}" \
      --location="${REGION}" \
      --uniform-bucket-level-access \
      --public-access-prevention
  fi

  local origins='["http://localhost:3000"]'
  if service_exists; then
    local run_url
    run_url="$(gcloud run services describe "${SERVICE}" \
      --region="${REGION}" \
      --project="${PROJECT_ID}" \
      --format='value(status.url)')"
    origins="$(printf '["http://localhost:3000","%s"]' "${run_url}")"
  fi

  local cors_file
  cors_file="$(mktemp)"
  cat >"${cors_file}" <<EOF
[{"origin": ${origins}, "method": ["GET", "PUT", "HEAD", "OPTIONS"], "responseHeader": ["Content-Type", "Content-Length", "Content-Range", "x-goog-resumable"], "maxAgeSeconds": 3600}]
EOF
  gcloud storage buckets update "gs://${GCS_BUCKET}" \
    --project="${PROJECT_ID}" \
    --cors-file="${cors_file}"
  rm -f "${cors_file}"

  if service_exists; then
    grant_media_access "$(runtime_service_account)"
  fi

  echo "Bucket ${GCS_BUCKET} on yksityinen. Cloud Runin muuttujat tulevat komennolla: ./scripts/deploy-infra.sh config"
}

cmd_config() {
  require_cmd gcloud
  gcloud services enable run.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com --project="${PROJECT_ID}"
  service_exists || die "Cloud Run -palvelu puuttuu. Aja ensin: ./scripts/deploy-hosting.sh"
  instance_exists || die "Cloud SQL -instanssi puuttuu. Aja ensin: ./scripts/deploy-infra.sh sql"
  secret_exists || die "DATABASE_URL-secret puuttuu. Aja ensin: ./scripts/deploy-infra.sh sql"

  local runtime_sa
  runtime_sa="$(runtime_service_account)"
  gcloud secrets add-iam-policy-binding "${DATABASE_SECRET}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${runtime_sa}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${runtime_sa}" \
    --role="roles/cloudsql.client" \
    --quiet >/dev/null

  local -a media_args=()
  if bucket_exists; then
    grant_media_access "${runtime_sa}"
    media_args+=(--update-env-vars="MEDIA_STORE=gcs,GCS_BUCKET=${GCS_BUCKET}")
  else
    echo "Media-bucketia ei ole. Kuvat ja video jäävät pois, kunnes ajat: ./scripts/deploy-infra.sh bucket"
  fi

  # Ei vaihda kuvaa. Uusi revisio syntyy asetuksista.
  gcloud run services update "${SERVICE}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --platform=managed \
    --add-cloudsql-instances="${INSTANCE_CONNECTION}" \
    --update-secrets="DATABASE_URL=${DATABASE_SECRET}:latest" \
    --update-env-vars="DATABASE_POOL_MAX=${DATABASE_POOL_MAX}" \
    "${media_args[@]}" \
    --memory="${SERVICE_MEMORY}" \
    --cpu="${SERVICE_CPU}" \
    --concurrency="${SERVICE_CONCURRENCY}" \
    --port=8080 \
    --quiet

  gcloud run services add-iam-policy-binding "${SERVICE}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --quiet >/dev/null

  echo "Palvelun asetukset päivitettiin. Konttia ei rakennettu eikä migraatiota ajettu."
  gcloud run services describe "${SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --format='value(status.url)'
}

read_database_url() {
  gcloud secrets versions access latest \
    --secret="${DATABASE_SECRET}" \
    --project="${PROJECT_ID}" | tr -d '\n'
}

proxy_url_from_secret() {
  local database_url="$1"
  DATABASE_URL="${database_url}" \
  PROXY_PORT="${PROXY_PORT}" \
  python3 -c 'import os; from urllib.parse import urlparse, quote, unquote; raw=os.environ["DATABASE_URL"].strip(); port=os.environ["PROXY_PORT"]; parsed=urlparse(raw); user=unquote(parsed.username or ""); password=unquote(parsed.password or ""); database=unquote(parsed.path.lstrip("/"));
assert user and password and database, "DATABASE_URL on virheellinen.";
print("postgresql://%s:%s@127.0.0.1:%s/%s" % (quote(user, safe=""), quote(password, safe=""), port, quote(database, safe="")), end="")'
}

PROXY_PID=""

stop_proxy() {
  if [[ -n "${PROXY_PID}" ]]; then
    kill "${PROXY_PID}" 2>/dev/null || true
    wait "${PROXY_PID}" 2>/dev/null || true
    PROXY_PID=""
  fi
}

start_proxy() {
  require_cmd cloud-sql-proxy
  stop_proxy
  cloud-sql-proxy --port "${PROXY_PORT}" "${INSTANCE_CONNECTION}" >/tmp/oppimistehtavat-sql-proxy.log 2>&1 &
  PROXY_PID=$!
  trap 'stop_proxy' EXIT
  local attempt
  for attempt in $(seq 1 30); do
    if ! kill -0 "${PROXY_PID}" 2>/dev/null; then
      die "Cloud SQL Auth Proxy pysähtyi. Katso /tmp/oppimistehtavat-sql-proxy.log"
    fi
    if (echo >/dev/tcp/127.0.0.1/"${PROXY_PORT}") >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done
  die "Cloud SQL Auth Proxy ei avannut porttia ${PROXY_PORT}."
}

with_database() {
  require_cmd gcloud
  require_cmd python3
  require_cmd node
  [[ -x "${ROOT_DIR}/sovellus/node_modules/.bin/tsx" ]] || die "Aja ensin sovellus-kansiossa: npm install"
  secret_exists || die "DATABASE_URL-secret puuttuu. Aja ensin: ./scripts/deploy-infra.sh sql"
  instance_exists || die "Cloud SQL -instanssi puuttuu. Aja ensin: ./scripts/deploy-infra.sh sql"

  local database_url proxy_url
  database_url="$(read_database_url)"
  proxy_url="$(proxy_url_from_secret "${database_url}")"
  unset database_url
  start_proxy
  (
    cd "${ROOT_DIR}/sovellus"
    DATABASE_URL="${proxy_url}" "$@"
  )
  local status=$?
  unset proxy_url
  stop_proxy
  return "${status}"
}

cmd_migrate() {
  with_database "${ROOT_DIR}/sovellus/node_modules/.bin/tsx" scripts/migrate.ts
  echo "Migraatiot ajettiin. Cloud Run -revisiota ei julkaistu."
}

cmd_seed() {
  local name="${TEACHER_NAME:-}"
  local email="${TEACHER_EMAIL:-}"
  local password="${TEACHER_PASSWORD:-}"
  if [[ -z "${name}" || -z "${email}" || ${#password} -lt 8 ]]; then
    die "Aseta TEACHER_NAME, TEACHER_EMAIL ja vähintään 8 merkin TEACHER_PASSWORD. Sovellus/.env-tiedostoa ei lueta."
  fi
  with_database \
    env TEACHER_NAME="${name}" TEACHER_EMAIL="${email}" TEACHER_PASSWORD="${password}" \
    "${ROOT_DIR}/sovellus/node_modules/.bin/tsx" scripts/seed.ts
  unset password
  echo "Opettajan luonti ajettiin. Olemassa olevan opettajan salasanaa ei vaihdeta."
}

main() {
  local command="${1:-}"
  case "${command}" in
    registry) cmd_registry ;;
    sql) cmd_sql ;;
    secrets) cmd_secrets ;;
    bucket) cmd_bucket ;;
    config) cmd_config ;;
    migrate) cmd_migrate ;;
    seed) cmd_seed ;;
    -h|--help|help|"") usage ;;
    *)
      usage >&2
      die "Tuntematon komento: ${command}"
      ;;
  esac
}

main "$@"
