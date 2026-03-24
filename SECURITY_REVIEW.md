# Security Review: Füüsika Tagasiside — Pilot Readiness

**Review Date:** 2026-03-24
**Scope:** Next.js backend handling student test data (minors) in Estonian schools
**Critical Context:** GDPR + child data protection applies

---

## CRITICAL (must fix before any real student data)

### 1. `.env.local` file committed to repository
**Type:** Secrets exposure / Credentials leakage
**File:** `.env.local` (line 1)
**Risk Level:** CRITICAL
**Finding:**
- `ANTHROPIC_API_KEY` is committed in plaintext
- `CRON_SECRET` is committed in plaintext
- If this repo is ever made public, credentials are permanently exposed

**Recommended Fix:**
1. Immediately rotate all secrets (ANTHROPIC_API_KEY, CRON_SECRET, RESEND_API_KEY)
2. Remove `.env.local` from Git history:
   ```bash
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env.local' --prune-empty --tag-name-filter cat -- --all
   git push --force --all
   ```
3. Add `.env.local` to `.gitignore` (already present, but file was already committed before it was added to ignore)
4. Use GitHub/Vercel Secrets management instead
5. Before pilot launch, verify no secrets remain in Git history

---

### 2. `/api/analyze` endpoint lacks authentication and authorization
**Type:** Unauthorized API access / Unvalidated testResultId updates
**File:** `app/api/analyze/route.ts` (lines 19–60)
**Risk Level:** CRITICAL
**Finding:**
- No authentication check (no session validation)
- No authorization check (anyone can submit images for AI analysis)
- No rate limiting for authenticated requests (only IP-based, which doesn't scale)
- **Critical:** Can update any testResultId without verifying:
  - Ownership (who owns the test?)
  - Consent (has parent consented to AI analysis?)
- Could be exploited to analyze any student's test without parent consent (GDPR violation)
- In-memory rate limiting (line 5 `requestCounts = new Map()`) is cleared on server restart; doesn't persist across replicas

**Recommended Fix:**
1. Add session/authentication check before analyzing:
   ```ts
   const token = request.cookies.get('mu_session')?.value;
   if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   const session = await getSessionUser(token);
   ```
2. If testResultId is provided, verify:
   - Test belongs to authenticated teacher
   - Parent consent is active (check hasAIConsent)
3. If no testResultId, disallow analysis (API should only work for pre-authorized test results)
4. Use database-backed rate limiting (Redis or persistent table) instead of in-memory Map
5. Require explicit parent consent before returning feedback

---

### 3. Timing-safe password comparison not fully enforced
**Type:** Timing attack / User enumeration
**File:** `app/api/auth/login/route.ts` (lines 45–55)
**Risk Level:** CRITICAL
**Finding:**
- bcrypt.compare (line 57) is timing-safe ✓
- **However:** Early return at line 45 if user not found means response time differs for non-existent emails vs. wrong passwords
- Line 47-54: "Still audit failure even for unknown email" comment suggests awareness, but doesn't fully prevent timing leak
- Attacker can enumerate valid email addresses by measuring response time

**Recommended Fix:**
```ts
// Always run bcrypt.compare to take constant time
const user = await db.user.findUnique({ where: { email } });
const passwordMatch = user ? await bcrypt.compare(password, user.password) : await bcrypt.compare(password, '$2a$12$fake');
if (!user || !passwordMatch) {
  // same error message, same flow time
}
```

---

### 4. Rate limiting does not scale across horizontal replicas
**Type:** Distributed system vulnerability / Rate limit bypass
**Files:** `app/api/analyze/route.ts` (line 5), `app/api/auth/login/route.ts` (lines 7–31)
**Risk Level:** CRITICAL (at scale)
**Finding:**
- Both endpoints use in-memory rate limiting (`Map` in Node.js memory)
- Each server instance has its own `Map`, not shared
- If deployed across multiple replicas (which will happen in production), attacker can round-robin requests across replicas and bypass limits
- Example: 10 requests/min per IP, but with 5 replicas = 50 requests/min total

**Recommended Fix:**
1. Migrate to Redis-backed rate limiting (Vercel offers Redis add-on)
2. Use library like `@vercel/kv` with sliding window:
   ```ts
   import { kv } from '@vercel/kv';
   const key = `rate:analyze:${ip}`;
   const count = await kv.incr(key);
   if (count === 1) await kv.expire(key, 60);
   if (count > 10) return 429;
   ```

---

## HIGH (fix before wider rollout)

### 5. In-memory rate limiting on /analyze can leak memory
**Type:** Memory leak / Denial of service
**File:** `app/api/analyze/route.ts` (lines 5–16)
**Risk Level:** HIGH
**Finding:**
- `requestCounts` Map is never cleaned up
- If attacker hammers endpoint from 1000 unique IPs, Map grows unbounded
- Each entry holds `{ count, resetTime }` forever
- After long enough, will cause memory exhaustion and server crash

**Recommended Fix:**
```ts
// Periodically clean up expired entries
if (record.resetTime < now) {
  requestCounts.delete(ip);  // clean up
}
// OR use a proper rate-limit library
```

---

### 6. Session tokens use UUID instead of cryptographically longer value
**Type:** Token entropy / Session fixation risk (lower priority)
**Files:** `app/api/auth/login/route.ts` (line 68), `app/api/auth/register/route.ts` (line 40)
**Risk Level:** HIGH (for 30-day expiry)
**Finding:**
- `crypto.randomUUID()` generates 128-bit entropy (good)
- BUT: stored as string in DB, used directly in httpOnly cookie (good practices ✓)
- However: UUID format is standardized (128-bit split 6-4-4-4-12), not cryptographically randomized across all bits
- For a 30-day session, better to use full random bytes
- `lib/auth.ts` line 18-22 shows proper random generation, but login/register don't use it

**Recommended Fix:**
```ts
// Use the approach from lib/auth.ts createSession()
const tokenBytes = new Uint8Array(32);
crypto.getRandomValues(tokenBytes);
const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
```

---

### 7. No CSRF protection on state-changing endpoints
**Type:** Cross-Site Request Forgery
**Files:** All POST/PATCH/DELETE endpoints
**Risk Level:** HIGH (for teacher workflows)
**Finding:**
- Cookies use `sameSite: 'lax'` ✓ (good for top-level navigation)
- BUT: No CSRF token validation
- Teacher could be tricked into clicking a link that approves a test result on another site
- Lax SameSite mitigates but doesn't prevent all CSRF (POST via forms still vulnerable)

**Recommended Fix:**
1. Use double-submit cookie pattern or hidden CSRF token
2. Example with jose (already installed):
   ```ts
   import { jwtVerify } from 'jose';
   const secret = new TextEncoder().encode(process.env.CSRF_SECRET);
   // On form: add hidden input with JWT token
   // On POST: verify token matches session
   ```

---

### 8. `x-forwarded-for` header is trusted for rate limiting (can be spoofed)
**Type:** Header spoofing / Rate limit bypass
**Files:** `app/api/auth/login/route.ts` (line 21), `app/api/analyze/route.ts` (line 20)
**Risk Level:** HIGH
**Finding:**
- Code uses `request.headers.get('x-forwarded-for')` directly
- In a trusted reverse proxy (Vercel) this is safe, but the `.split(',')[0]?.trim()` pattern is missing from analyze endpoint
- If deployed behind untrusted proxy, attacker can spoof IP by sending `X-Forwarded-For: 1.1.1.1, 1.1.1.2, attacker-ip`
- Vercel is trustworthy, but worth documenting

**Recommended Fix:**
1. Document assumption: "Assumes deployment behind Vercel's trusted reverse proxy"
2. Add validation in auth routes (login has it, analyze doesn't):
   ```ts
   const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
   ```

---

### 9. `/api/account/export` lacks student/parent access control
**Type:** Broken access control / GDPR data breach
**File:** `app/api/account/export/route.ts` (lines 31–42)
**Risk Level:** HIGH
**Finding:**
- Line 36: `if (!user.adminProfile) return 403` ✓ correctly restricts admins
- BUT: No check that the user is requesting their own data
- If a student is in the system, they can request any other student's data by passing `?studentId=<other-id>`
- Lines 60–63 allow bypass: only checks `if (targetStudentId)` but doesn't verify it's the authenticated student
- A parent registered in the system could export any student's data

**Recommended Fix:**
```ts
if (targetStudentId) {
  if (!user.adminProfile) {
    return NextResponse.json({ error: 'Ligipääs keelatud' }, { status: 403 });
  }
  // Verify studentId exists and belongs to the admin's school (if SCHOOL_ADMIN)
  // ...
} else if (!user.studentProfile) {
  // Regular user can only export own data if they have studentProfile
  return NextResponse.json({ error: 'Ligipääs keelatud' }, { status: 403 });
}
```

---

### 10. Student name in `/api/analyze` payload is not validated for consent
**Type:** Missing authorization / GDPR consent violation
**File:** `app/api/analyze/route.ts` (line 26, "opilane" parameter)
**Risk Level:** HIGH
**Finding:**
- `opilane` (student name) is accepted from request body without validation
- No check if this student has active parent consent
- No check if the name matches a real student
- Teacher could request AI analysis for any fictional student name
- While the name is pseudonymized before sending to Anthropic ("Õpilane"), the lack of consent check is still a GDPR violation if misused

**Recommended Fix:**
```ts
// If testResultId is provided, verify consent via existing result
if (testResultId) {
  const result = await db.testResult.findUnique({ where: { id: testResultId } });
  if (!result?.studentId) return 400;
  const hasConsent = await hasAIConsent(result.studentId, null);
  if (!hasConsent) return 403; // Consent required
}
```

---

## MEDIUM (acceptable for small pilot)

### 11. No Content Security Policy (CSP) headers
**Type:** XSS mitigation
**Files:** Next.js response headers (not explicitly set)
**Risk Level:** MEDIUM
**Finding:**
- One instance of `dangerouslySetInnerHTML` found: `app/dashboard/exercises/[id]/print/page.tsx`
  - Used for `<script>window.onload = window.print()</script>` (safe, but risky pattern)
- No CSP header set globally
- If any endpoint reflected user input unsanitized, could allow XSS

**Recommended Fix:**
1. Add CSP header in `next.config.js`:
   ```js
   headers: [
     { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'" }
   ]
   ```
2. Replace `dangerouslySetInnerHTML` with safer approach or remove if possible

---

### 12. Session expiration is not enforced on client
**Type:** Session management
**File:** `lib/auth.ts` (line 24–25 sets 30-day expiry)
**Risk Level:** MEDIUM
**Finding:**
- Server validates expiry at every request ✓
- But cookie expiry is set via `expiresAt` and also passed to `response.cookies.set()`
- No refresh token mechanism; stale cookie could theoretically be re-used if DB is compromised
- 30-day session is long for student data; higher compromise risk

**Recommended Fix:**
1. Reduce session duration to 7 days for students, 14 days for teachers
2. Implement refresh token pattern (optional for pilot)
3. Add "last activity" timestamp to session, invalidate after 8 hours of inactivity

---

### 13. No rate limiting on consent endpoint
**Type:** Brute-force / Spam
**File:** `app/api/consent/request/route.ts` (not checked explicitly)
**Risk Level:** MEDIUM
**Finding:**
- No rate limiting on sending consent requests
- Teacher could spam 1000 parent email invites in one minute

**Recommended Fix:**
- Apply per-teacher rate limiting: max 10 consent requests per minute
- Use same Redis-backed approach as auth

---

### 14. Photo base64 validation is minimal
**Type:** Zip bomb / ReDoS / Malicious input
**File:** `app/api/tests/[id]/results/route.ts` (line 55), `lib/blob.ts` (line 14)
**Risk Level:** MEDIUM
**Finding:**
- Photos accepted as base64 strings (lines 54–55 in results route)
- No size limit check before base64 decode
- `Buffer.from(base64Data, 'base64')` could consume huge memory if given 1 GB base64 string
- Content-type hardcoded as 'image/jpeg' (good), but no magic number validation

**Recommended Fix:**
```ts
// Limit base64 string length (e.g., 10 MB = ~13 MB base64)
const MAX_BASE64_SIZE = 13 * 1024 * 1024;
if (base64Data.length > MAX_BASE64_SIZE) {
  return NextResponse.json({ error: 'Foto on liiga suur' }, { status: 400 });
}
// Validate magic bytes: JPEG = FF D8 FF
const buffer = Buffer.from(base64Data, 'base64');
if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
  return NextResponse.json({ error: 'Vigane pilt' }, { status: 400 });
}
```

---

### 15. Consent grant scope defaults to SPECIFIC_SUBJECT but can be null
**Type:** Logic error / Unintended permissions
**File:** `prisma/schema.prisma` (lines 360–382, esp. line 366)
**Risk Level:** MEDIUM
**Finding:**
- ConsentGrant.subjectId can be null (line 364)
- Scope defaults to SPECIFIC_SUBJECT (line 366)
- But line 22–24 in `lib/consent.ts` interprets null as "all subjects"
- Mismatch between scope enum and actual behavior
- If a SPECIFIC_SUBJECT grant is created with subjectId=null, it silently grants all subjects

**Recommended Fix:**
```ts
// Either:
// 1. Enforce: if scope=SPECIFIC_SUBJECT, subjectId must not be null
// 2. Or: rename scope to match behavior (ALL_SUBJECTS vs SUBJECT_LIMITED)
// Recommended: Add DB constraint
model ConsentGrant {
  // ...
  scope ConsentScope
  subjectId String?

  @@check("(scope = 'ALL_SUBJECTS' AND subjectId IS NULL) OR (scope = 'SPECIFIC_SUBJECT' AND subjectId IS NOT NULL)")
}
```

---

## LOW (track for later)

### 16. Audit log retention is 90 days, but GDPR may require 1 year
**Type:** Compliance / Record-keeping
**File:** `app/privacy/page.tsx` (line 100)
**Risk Level:** LOW
**Finding:**
- Audit logs are kept for 90 days (line 100)
- GDPR Art. 32 (security) and Art. 5 (integrity) suggest longer retention for sensitive systems
- Estonian data protection authority may expect 1-year retention for school data

**Recommended Fix:**
- Extend audit log retention to 365 days for production
- Clearly document retention policy with legal review

---

### 17. No API versioning or deprecation strategy
**Type:** API stability
**Files:** All `/api/` routes
**Risk Level:** LOW
**Finding:**
- No version prefix in routes (e.g., `/api/v1/analyze`)
- If API changes, clients break immediately

**Recommended Fix:**
- Optional for pilot, but plan for v1 prefix if scaling

---

### 18. Error messages could be more specific for debugging
**Type:** Information disclosure / UX
**Finding:**
- Most endpoints return generic "Serveriviga" (server error) on exceptions
- Helpful for security (no stack traces), but hard to debug

**Recommended Fix:**
- For pilot, use Sentry integration (already installed in package.json) to log errors server-side

---

## Summary

| Severity | Count | Blockers for Pilot |
|----------|-------|-------------------|
| CRITICAL | 4 | MUST FIX before any real student data |
| HIGH | 6 | Fix before wider rollout (acceptable for <100 users) |
| MEDIUM | 4 | Acceptable for pilot |
| LOW | 4 | Track for production |

### Pilot Readiness: **NOT READY** (Critical issues must be resolved)

**Minimum actions before pilot launch:**
1. Rotate all secrets and remove from Git history
2. Add authentication + consent checks to `/api/analyze`
3. Migrate rate limiting to Redis (Vercel KV)
4. Fix `/api/account/export` access control
5. Add timing-safe password comparison
6. (Strongly recommended) Add CSRF protection

Estimated remediation time: 2–3 days for critical issues + testing.

---

**Reviewed by:** Security Engineer
**Date:** 2026-03-24
