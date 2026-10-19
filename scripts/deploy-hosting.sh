#!/usr/bin/env bash
# Julkaisee uuden Oppimistehtävät-version Cloud Runiin.
# Rakentaa kontin, vie sen Artifact Registryyn ja päivittää vain palvelun revision.
#
# Ei luo tietokantaa, ei aja migraatioita, ei kirjoita ympäristömuuttujia
# eikä Secret Manager -secrettejä. Ne ovat scripts/deploy-infra.sh-tiedostossa.
#
# Älä lisää tähän komentoja, jotka vaihtavat palvelun asetuksia:
# --set-env-vars, --update-env-vars, --env-vars-file,
# --set-secrets, --update-secrets, --clear-secrets, --remove-secrets,
# --set-cloudsql-instances, --add-cloudsql-instances.

set -euo pipefail

if [[ $- == *x* ]]; then
  echo "Skriptiä ei ajeta jäljitystilassa." >&2
  exit 1
fi

if [[ $# -gt 0 ]]; then
  echo "deploy-hosting.sh ei ota argumentteja." >&2
  echo "Kanta, muuttujat ja secretit: ./scripts/deploy-infra.sh" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=gcp-env.sh
source "${SCRIPT_DIR}/gcp-env.sh"

die() {
  echo "$1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Komento puuttuu: $1"
}

require_cmd docker
require_cmd gcloud

if [[ ! -f "${ROOT_DIR}/sovellus/Dockerfile" ]]; then
  die "sovellus/Dockerfile puuttuu."
fi

if [[ ! -f "${ROOT_DIR}/sovellus/.dockerignore" ]] || ! grep -qx '\.env' "${ROOT_DIR}/sovellus/.dockerignore"; then
  die "sovellus/.dockerignore ei sulje .env-tiedostoa. Kuvaan ei saa päätyä salaisuuksia."
fi

if git -C "${ROOT_DIR}/sovellus" rev-parse --short HEAD >/dev/null 2>&1; then
  default_tag="$(git -C "${ROOT_DIR}/sovellus" rev-parse --short HEAD)"
elif git -C "${ROOT_DIR}" rev-parse --short HEAD >/dev/null 2>&1; then
  default_tag="$(git -C "${ROOT_DIR}" rev-parse --short HEAD)"
else
  default_tag="manual"
fi
TAG="${TAG:-${default_tag}-$(date +%Y%m%d%H%M%S)}"
IMAGE_REF="${REGISTRY_HOST}/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${TAG}"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

if ! gcloud artifacts repositories describe "${REPOSITORY}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}" >/dev/null; then
  die "Artifact Registry -repoa ei voitu lukea. Jos repo puuttuu, aja ensin: ./scripts/deploy-infra.sh registry"
fi

gcloud auth configure-docker "${REGISTRY_HOST}" --quiet

docker build \
  -f "${ROOT_DIR}/sovellus/Dockerfile" \
  -t "${IMAGE_REF}" \
  "${ROOT_DIR}/sovellus"

docker push "${IMAGE_REF}"

service_existed=0
if gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" >/dev/null 2>&1; then
  service_existed=1
fi

deploy_args=(
  gcloud run deploy "${SERVICE}"
  --project="${PROJECT_ID}"
  --region="${REGION}"
  --platform=managed
  --image="${IMAGE_REF}"
  --quiet
)

# Uusi palvelu jää yksityiseksi, kunnes deploy-infra.sh config avaa sen.
# Olemassa olevalle palvelulle lippua ei anneta, jotta IAM ja muut asetukset säilyvät.
if [[ "${service_existed}" -eq 0 ]]; then
  deploy_args+=(--no-allow-unauthenticated)
fi

"${deploy_args[@]}"

echo "Versio julkaistu: ${IMAGE_REF}"
gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)'

if [[ "${service_existed}" -eq 0 ]]; then
  echo "Palvelu luotiin pelkällä kontilla. Liitä kanta ja secretit: ./scripts/deploy-infra.sh config" >&2
fi
