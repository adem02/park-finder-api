#!/usr/bin/env sh
# Vérifie qu'une API qui vient de démarrer répond vraiment : routage, injection, validation,
# Swagger. Sans base de données (CI) : /health répond 503, et c'est attendu.
#
# Usage : scripts/smoke-test.sh http://localhost:3000
set -eu

BASE_URL="${1:?usage: smoke-test.sh <base-url>}"
TIMEOUT_S="${SMOKE_TIMEOUT_S:-60}"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

status_of() {
  curl -s -o /dev/null -w '%{http_code}' "$@"
}

echo "Attente de $BASE_URL/health (au plus ${TIMEOUT_S} s)..."
elapsed=0
until [ "$(status_of "$BASE_URL/health")" != "000" ]; do
  elapsed=$((elapsed + 1))
  [ "$elapsed" -ge "$TIMEOUT_S" ] && fail "l'API ne répond pas après ${TIMEOUT_S} s"
  sleep 1
done

health=$(status_of "$BASE_URL/health")
case "$health" in
  200 | 503) echo "ok   /health -> $health" ;;
  *) fail "/health -> $health (attendu 200, ou 503 sans base)" ;;
esac

# Swagger : le document est généré depuis les métadonnées émises par tsc et le plugin.
docs=$(curl -s "$BASE_URL/api/docs-json")
echo "$docs" | grep -q '"/auth/login"' || fail "/api/docs-json ne décrit pas /auth/login"
echo "ok   /api/docs-json décrit les routes"

# Interface de Swagger : fichiers statiques servis depuis swagger-ui-dist.
ui=$(status_of "$BASE_URL/api/docs/swagger-ui.css")
[ "$ui" = "200" ] || fail "/api/docs/swagger-ui.css -> $ui"
echo "ok   /api/docs sert ses fichiers statiques"

# Validation : un corps vide doit être refusé par le ValidationPipe (class-validator).
login=$(status_of -X POST -H 'Content-Type: application/json' -d '{}' "$BASE_URL/auth/login")
[ "$login" = "400" ] || fail "POST /auth/login {} -> $login (attendu 400)"
echo "ok   POST /auth/login {} -> 400"

# Garde JWT : sans jeton, une route protégée répond 401.
me=$(status_of "$BASE_URL/users/me")
[ "$me" = "401" ] || fail "GET /users/me sans jeton -> $me (attendu 401)"
echo "ok   GET /users/me sans jeton -> 401"

echo "Smoke test réussi."
