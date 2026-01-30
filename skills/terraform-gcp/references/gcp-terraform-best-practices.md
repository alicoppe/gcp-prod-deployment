## Google Cloud + Terraform: reference notes (sources)

### Structure & modules
- Google recommends standard module structure (`main.tf`, `variables.tf`, `outputs.tf`) and grouping resources by purpose, not one file per resource. Also use consistent naming and describe variables.  
  Source: https://docs.cloud.google.com/docs/terraform/best-practices/general-style-structure
- Root configs should stay small; split into `modules/` + `environments/` (dev/qa/prod), one root per env.  
  Source: https://docs.cloud.google.com/docs/terraform/best-practices/root-modules
- Reusable modules should expose outputs for resources, avoid providers/backends inside modules, and if enabling APIs, make it optional and avoid disabling on destroy.  
  Source: https://docs.cloud.google.com/docs/terraform/best-practices/reusable-modules

### Enabling APIs
- Use `google_project_service` to enable required APIs before provisioning resources; API enablement is a prerequisite for resource creation.  
  Source: https://docs.cloud.google.com/docs/terraform/understanding-apis-and-terraform

### Serverless VPC Access connectors (Cloud Run → VPC)
- Connectors run on connector instances with machine types; min instances **>= 2**, max **<= 10**; defaults min 2 / max 10.  
  Source: https://docs.cloud.google.com/vpc/docs/serverless-vpc-access
- Pricing: connectors are billed as Compute Engine VMs per instance; data transfer out is billed at VM egress rates.  
  Source: https://cloud.google.com/vpc/pricing
- Direct VPC egress (Cloud Run) can avoid connector compute charges; connectors incur compute + egress.  
  Source: https://docs.cloud.google.com/run/docs/configuring/connecting-vpc
