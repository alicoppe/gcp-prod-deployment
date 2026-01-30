---
name: terraform-gcp
description: Create or update Terraform for Google Cloud in this repo: structure, validation, provisioning steps, and cost/option tradeoffs for new resources.
---

# Terraform on GCP (Repo Skill)

Use this skill when adding or changing **Terraform** in this repository, especially for **Google Cloud** resources. Keep changes consistent with existing module/env layout and CI workflow.

## Quick workflow
1) **Scan existing modules/envs** to find the correct place (usually `infra/terraform/modules/*` + `infra/terraform/envs/{dev,prod}`).
2) **Enable required APIs** via `google_project_service` in the root env if the API is new.
3) **Add/extend module inputs/outputs** and wire them in dev/prod root.
4) **Validate**: `terraform fmt -recursive`, `terraform validate`, and `terraform plan`.
5) **Document**: update `README.md` + `AGENTS.md` when workflows/infrastructure change.

## Adding a new resource (checklist)
- **Location**: place shared logic in `modules/`, environment-specific config in `envs/dev` and `envs/prod`.
- **APIs**: if the resource requires an API, add `google_project_service` and `depends_on`.
- **IAM**: determine who needs access (Terraform SA, runtime SA). Add bindings explicitly.
- **Networking**: if VPC access is required, decide between **Serverless VPC Access connector** vs **Direct VPC Egress** (see references).
- **Secrets**: prefer Secret Manager; wire via secret env vars instead of plaintext.
- **Outputs**: expose key outputs in module and root outputs (URLs, IDs, addresses).

## Ambiguity & cost/tradeoff handling
If a resource has sizing/tiers/quotas (e.g., Cloud Run min/max, VPC connectors, Redis tiers):
1) **List options** (tier/size, min/max, SLA).
2) **Look up pricing + limits** (use the references file).
3) **Recommend** the cheapest safe default for dev and a balanced option for prod.

**Rule**: If requirements aren’t clear, ask the user to choose. Include a recommendation with rationale.

## Validation commands
Run these locally when changing Terraform:
```sh
terraform fmt -recursive
terraform validate
terraform plan -var-file=terraform.tfvars
```

## References (load only when needed)
- **GCP Terraform best practices + pricing**: `skills/terraform-gcp/references/gcp-terraform-best-practices.md`

