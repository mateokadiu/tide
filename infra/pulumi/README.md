# tide on Oracle Cloud Always-Free

Pulumi-TS recipe that brings up tide on a single Ampere A1 VM in Oracle
Cloud's Always-Free tier.

## Prerequisites

- Pulumi CLI ≥ v3.140.
- An Oracle Cloud account with the Always-Free tier active. (No credit card
  charges accrue if you stick to the free shapes.)
- The `oci` CLI configured with credentials, or set `OCI_*` env vars per
  the [Pulumi OCI provider docs](https://www.pulumi.com/registry/packages/oci/).
- A DNS name you can point an A record at.

## Configure

```bash
cd infra/pulumi
pnpm install

pulumi stack init prod
pulumi config set tide:compartmentOcid ocid1.compartment.oc1..xxx
pulumi config set tide:imageOcid       ocid1.image.oc1.phx.xxx        # Ubuntu 22.04 ARM
pulumi config set tide:availabilityDomain "Uocm:PHX-AD-1"
pulumi config set --secret tide:sshPublicKey "$(cat ~/.ssh/id_ed25519.pub)"

pulumi config set tide:host           tide.example.com
pulumi config set tide:letsencryptEmail you@example.com

pulumi config set --secret tide:authSecret        "$(openssl rand -base64 32)"
pulumi config set --secret tide:postgresPassword  "$(openssl rand -base64 24)"
pulumi config set         tide:minioRootUser      tide-minio
pulumi config set --secret tide:minioRootPassword "$(openssl rand -base64 24)"

# optional
pulumi config set --secret tide:anthropicApiKey   sk-ant-xxx
pulumi config set         tide:imageTag           v0.1.0
```

## Deploy

```bash
pulumi up
# → outputs `publicIp` (and a `dnsTarget` hint)
```

Point your A record at `publicIp`, wait for cloud-init to finish:

```bash
ssh ubuntu@$(pulumi stack output publicIp) "sudo cloud-init status --wait"
```

Visit `https://tide.example.com`. Traefik will issue the LE certificate on
first hit.

## Cost

Always-Free for the shape we use, indefinitely. If you exceed the Always-Free
quota (e.g. egress > 10 TB/month) you'll start to accrue charges; for a
read-later library that's effectively never.

## Tear down

```bash
pulumi destroy
```

The block volume holding `/var/lib/tide` is part of the instance; destroying
the instance removes the volume too. Take a Postgres dump first if you care
about your saved articles.

## Why this and not Terraform / OpenTofu

Pulumi-TS lets the recipe live in the same language as the app. Forking the
recipe to AWS Lightsail or Hetzner is a `provider` swap; with HCL it would be
a port.
