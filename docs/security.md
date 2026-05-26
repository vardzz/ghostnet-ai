# GhostNet AI Security, Privacy, and Compliance Posture

## 1. API Key and Credential Management

GhostNet AI handles live web proxies, browser automation credentials, and third-party AI keys. The security model must assume that any leaked secret can be abused to scrape at scale or burn through paid API quotas.

### Storage Rules

- Keep Bright Data credentials in server-only environment variables.
- Keep Claude or Anthropic credentials in server-only environment variables.
- Keep the Supabase service role key in server-only environment variables.
- Use Supabase Vault for long-lived operational secrets where managed secret storage is preferred.
- Never place service credentials in client-side code, static JSON files, or browser-exposed build artifacts.

### Access Rules

- Route handlers and server actions are the only permitted execution boundaries for privileged calls.
- The browser should only see read-only data needed to render the dashboard.
- Any token needed by the client should be a low-privilege, tenant-scoped token with the smallest possible permission set.
- Service role access must be confined to mutation workflows that write evidence, create scans, or generate legal reports.

### Rotation and Audit

- Rotate API keys at a predictable cadence and immediately after any suspected exposure.
- Track which service consumed which secret by tagging outgoing requests with a request ID and scan ID.
- Log secret usage metadata, never the secret itself.
- Alert on unusual traffic patterns, especially if a key begins failing across multiple vendors simultaneously.

### Secret Handling Pattern

Recommended server-side shape:

```ts
interface SecretBundle {
  brightDataApiKey: string;
  anthropicApiKey: string;
  supabaseServiceRoleKey: string;
  evidenceBucketName: string;
  reportBucketName: string;
}
```

Operational rules:

- load secrets at process startup
- fail fast if a required key is absent
- do not forward secrets into the browser render tree
- use short-lived signed URLs for evidence access instead of public writable buckets; public URLs are acceptable only for demo environments with restricted scope

## 2. Defensive Data Isolation

GhostNet AI is a multi-brand monitoring system. Evidence must be isolated per brand so one tenant cannot see another tenant's scraped material or report history.

### Isolation Boundaries

- Every brand record is bound to a `tenant_id`.
- Every threat record includes the owning `brand_id` and `tenant_id`.
- Every screenshot and HTML artifact is stored under a brand-specific path prefix.
- Every live query filters by the current tenant before returning results.
- Every report export is stamped with a tenant and brand identifier.

### Recommended Storage Layout

- `evidence/<tenant_id>/<brand_id>/screenshots/`
- `evidence/<tenant_id>/<brand_id>/html/`
- `reports/<tenant_id>/<brand_id>/`

### Database Controls

- Use Supabase Row Level Security on every tenant-owned table.
- Enforce read rules that only allow the current authenticated tenant to see its rows.
- Use write policies that allow only server-side service operations or explicit owner context.
- Prefer generated UUIDs over guessable identifiers.

### Evidence Integrity

To preserve evidentiary value:

- store the source URL
- store the fetch timestamp
- store the scan ID
- store a checksum or hash of the artifact
- avoid post-processing the original HTML in place
- keep transformed analysis separate from raw evidence

### Client Exposure Limits

The browser may see:

- score
- confidence
- a screenshot URL
- a human-readable summary
- a report status

The browser must not see:

- secret credentials
- raw proxy authentication details
- service role credentials
- other tenant evidence
- internal-only analysis prompts

## 3. Hackathon Compliance Framework

GhostNet AI is meant for public, defensive brand protection. The system must remain responsible even under sprint pressure.

### Data Collection Principles

- Only collect material that is publicly accessible.
- Respect explicit access controls and authenticated-only boundaries.
- Use the minimum interaction necessary to record evidence.
- Do not exfiltrate personal data beyond what is necessary to establish impersonation or phishing behavior.
- Do not attempt to bypass security controls that would change the legality or ethics of collection.

### Site Boundary and Rate-Limit Respect

- Honor site-level boundaries where the crawl can still produce a useful signal.
- Use Bright Data to stabilize rendering, not to defeat access control.
- Stop the scan if the target begins to degrade service or blocks the crawl repeatedly.
- Record blocked status as a signal rather than forcing continued retries.

### Legal Review Guardrails

Claude-generated takedown material is a draft, not an autonomous legal decision.

Required safeguards:

- never send a notice without human review
- show the source evidence alongside every legal assertion
- clearly label unverified fields such as abuse contacts or registrar contacts when confidence is partial
- require a human to confirm jurisdiction before export
- preserve an audit trail of who approved the report

### Prompt and Output Safety

Because the system uses an LLM, prompt and output safety are part of security:

- keep prompts constrained to structured evidence packets
- reject model outputs that contain instructions to access secrets or escalate privileges
- validate all model JSON against a strict schema
- treat any non-conforming output as a review-only result

### Compliance Checklist

Before releasing any evidence or legal package, confirm all of the following:

- the threat is based on public data
- the evidence can be reproduced from stored artifacts
- the report includes a time-stamped source trail
- a human reviewed the generated legal language
- the final action complies with the event's legal and contest rules

## 4. Security Posture Summary

GhostNet AI should be operated as a zero-trust, least-privilege monitoring service:

- secrets stay server-side
- evidence is tenant-isolated
- model output is schema-validated
- legal actions are review-gated
- every artifact is timestamped and attributable

This keeps the hackathon build credible, defensible, and safe to demonstrate in front of judges, partners, or legal reviewers.
