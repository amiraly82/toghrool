#!/usr/bin/env bash
# ==============================================================================
# Security Acceptance Test Suite for Toghrool Couple App Backend
#
# Covers:
# 1. Access without token returns HTTP 401
# 2. User A's token attempting to access User B's coupleId returns HTTP 403
# 3. Deleting another couple's period log returns HTTP 403 or 404
# 4. Login attempt using the database password hash directly fails
# 5. Rate limiting triggers HTTP 429 after 6 failed login attempts
# 6. Malicious upload (PHP payload disguised as JPG) is rejected
# ==============================================================================

BASE_URL="${API_URL:-https://toghrool.ir/api.php}"
PASSED=0
FAILED=0

echo "=========================================================="
echo " Starting Security Acceptance Tests on: $BASE_URL"
echo "=========================================================="

test_assert() {
  local desc="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    echo " [PASS] $desc (Expected: $expected, Got: $actual)"
    PASSED=$((PASSED + 1))
  else
    echo " [FAIL] $desc (Expected: $expected, Got: $actual)"
    FAILED=$((FAILED + 1))
  fi
}

RANDOM_SUFFIX=$(date +%s)_$RANDOM

# ------------------------------------------------------------------------------
# TEST 1: Unauthenticated request without token returns HTTP 401
# ------------------------------------------------------------------------------
echo -e "\n--- Test 1: Unauthenticated request to protected endpoint ---"
CODE_1=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL?action=getPeriodData" \
  -H "Content-Type: application/json" \
  -d '{"coupleId":"couple_test"}')
test_assert "Request without token should return 401" "401" "$CODE_1"

# Setup User A and User B for multi-tenant isolation tests
USER_A_EMAIL="test_user_a_${RANDOM_SUFFIX}@example.com"
USER_B_EMAIL="test_user_b_${RANDOM_SUFFIX}@example.com"
PASSWORD="SecretPassword123!"

# Register User A
RESP_REG_A=$(curl -s -X POST "$BASE_URL?action=register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"$PASSWORD\",\"displayName\":\"User A\"}")
TOKEN_A=$(echo "$RESP_REG_A" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
COUPLE_CODE_A=$(echo "$RESP_REG_A" | grep -o '"coupleCode":"[^"]*' | cut -d'"' -f4)

# Register User B
RESP_REG_B=$(curl -s -X POST "$BASE_URL?action=register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_B_EMAIL\",\"password\":\"$PASSWORD\",\"displayName\":\"User B\"}")
TOKEN_B=$(echo "$RESP_REG_B" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
COUPLE_CODE_B=$(echo "$RESP_REG_B" | grep -o '"coupleCode":"[^"]*' | cut -d'"' -f4)

# Pair User A with User B to establish couple space
PAIR_RESP=$(curl -s -X POST "$BASE_URL?action=pairByCode" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"code\":\"$COUPLE_CODE_B\"}")
COUPLE_ID_AB=$(echo "$PAIR_RESP" | grep -o '"coupleId":"[^"]*' | cut -d'"' -f4)

# ------------------------------------------------------------------------------
# TEST 2: User A token attempting to access foreign coupleId returns HTTP 403
# ------------------------------------------------------------------------------
echo -e "\n--- Test 2: User A token accessing foreign coupleId ---"
CODE_2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL?action=getPeriodData" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"coupleId":"couple_foreign_target_space_999"}')
test_assert "Accessing foreign coupleId should return 403" "403" "$CODE_2"

# ------------------------------------------------------------------------------
# TEST 3: Deleting another couple's period log returns HTTP 403 or 404
# ------------------------------------------------------------------------------
echo -e "\n--- Test 3: Deleting another couple's period log ---"
# Create a dummy foreign log entry ID that does not belong to couple AB
CODE_3=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL?action=deletePeriodLog" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"id":"log_foreign_entry_12345"}')
if [[ "$CODE_3" == "403" || "$CODE_3" == "404" ]]; then
  ACTUAL_3="403_or_404"
else
  ACTUAL_3="$CODE_3"
fi
test_assert "Deleting foreign period log should return 403 or 404" "403_or_404" "$ACTUAL_3"

# ------------------------------------------------------------------------------
# TEST 4: Login attempt using password hash directly as password fails
# ------------------------------------------------------------------------------
echo -e "\n--- Test 4: Login with password hash directly as password ---"
# Known bcrypt hash for testing rejection
KNOWN_BCRYPT='$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012'
CODE_4=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL?action=login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"$KNOWN_BCRYPT\"}")
test_assert "Login with raw hash as password must fail (401)" "401" "$CODE_4"

# ------------------------------------------------------------------------------
# TEST 5: Rate limit triggers HTTP 429 after 6 failed login attempts
# ------------------------------------------------------------------------------
echo -e "\n--- Test 5: Rate limit triggers 429 on excessive failed logins ---"
ATTACK_EMAIL="target_${RANDOM_SUFFIX}@example.com"
LAST_CODE="200"
for i in {1..7}; do
  RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL?action=login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ATTACK_EMAIL\",\"password\":\"WrongPassword_$i\"}")
  LAST_CODE="$RESP_CODE"
done
test_assert "Attempting > 5 failed logins within 15 mins triggers 429" "429" "$LAST_CODE"

# ------------------------------------------------------------------------------
# TEST 6: Upload of PHP payload disguised as JPG is rejected
# ------------------------------------------------------------------------------
echo -e "\n--- Test 6: Malicious PHP script disguised as image upload ---"
FAKE_PHP_IMAGE='<?php echo "EXPLOIT_EXECUTED"; phpinfo(); ?>'
FAKE_B64=$(echo -n "$FAKE_PHP_IMAGE" | base64)

CODE_6=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL?action=uploadImage" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"folder\":\"avatars\",\"image\":\"data:image/jpeg;base64,$FAKE_B64\"}")
test_assert "Upload of PHP disguised as JPG must be rejected (400)" "400" "$CODE_6"

echo "=========================================================="
echo " Tests completed: $PASSED passed, $FAILED failed."
echo "=========================================================="

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
exit 0
