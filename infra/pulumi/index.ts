/**
 * Pulumi-TS recipe — Oracle Cloud Always-Free single-VM tide deploy.
 *
 *   - 1× VM.Standard.A1.Flex (2 OCPU / 12 GB RAM)
 *   - 1× Block volume (100 GB) mounted at /var/lib/tide
 *   - Bootstraps docker + docker-compose via cloud-init
 *   - Pulls infra/docker/docker-compose.yml + .env from this repo
 *   - Brings the stack up under Traefik with Let's Encrypt
 *
 * Inputs (Pulumi config):
 *   tide:compartmentOcid                   — your tenancy compartment OCID
 *   tide:imageOcid                         — Ubuntu 22.04 / 24.04 Ampere image OCID for your region
 *   tide:availabilityDomain                — e.g. "Uocm:PHX-AD-1"
 *   tide:sshPublicKey                      — the key you'll SSH in with
 *   tide:host                              — DNS name you'll point at the VM
 *   tide:letsencryptEmail                  — for the LE registration
 *   tide:authSecret                        — 32+ char secret
 *   tide:postgresPassword                  — strong password
 *   tide:minioRootUser / tide:minioRootPassword
 *   tide:anthropicApiKey                   — optional but recommended
 *
 * After `pulumi up`:
 *   1. Point an A record at the output `publicIp`.
 *   2. Wait for cloud-init to finish — `ssh ubuntu@<ip> "sudo cloud-init status --wait"`.
 *   3. Visit https://<host> — Traefik will issue the LE cert on first hit.
 */

import * as pulumi from '@pulumi/pulumi';
import * as oci from '@pulumi/oci';

const cfg = new pulumi.Config('tide');
const compartmentId = cfg.require('compartmentOcid');
const imageId = cfg.require('imageOcid');
const ad = cfg.require('availabilityDomain');
const sshPublicKey = cfg.requireSecret('sshPublicKey');
const host = cfg.require('host');
const leEmail = cfg.require('letsencryptEmail');
const authSecret = cfg.requireSecret('authSecret');
const postgresPassword = cfg.requireSecret('postgresPassword');
const minioRootUser = cfg.require('minioRootUser');
const minioRootPassword = cfg.requireSecret('minioRootPassword');
const anthropicApiKey = cfg.getSecret('anthropicApiKey') ?? pulumi.secret('');
const tideImageTag = cfg.get('imageTag') ?? 'v0.1.0';
const repoBranch = cfg.get('repoBranch') ?? 'main';

// --- network ---------------------------------------------------------------

const vcn = new oci.core.Vcn('tide-vcn', {
  compartmentId,
  cidrBlocks: ['10.20.0.0/16'],
  displayName: 'tide-vcn',
  isIpv6enabled: false,
});

const ig = new oci.core.InternetGateway('tide-ig', {
  compartmentId,
  vcnId: vcn.id,
  enabled: true,
});

const rt = new oci.core.RouteTable('tide-rt', {
  compartmentId,
  vcnId: vcn.id,
  routeRules: [{ destination: '0.0.0.0/0', networkEntityId: ig.id }],
});

const sl = new oci.core.SecurityList('tide-sl', {
  compartmentId,
  vcnId: vcn.id,
  egressSecurityRules: [{ destination: '0.0.0.0/0', protocol: 'all' }],
  ingressSecurityRules: [
    { protocol: '6', source: '0.0.0.0/0', tcpOptions: { min: 22, max: 22 } },
    { protocol: '6', source: '0.0.0.0/0', tcpOptions: { min: 80, max: 80 } },
    { protocol: '6', source: '0.0.0.0/0', tcpOptions: { min: 443, max: 443 } },
  ],
});

const subnet = new oci.core.Subnet('tide-subnet', {
  compartmentId,
  vcnId: vcn.id,
  cidrBlock: '10.20.1.0/24',
  routeTableId: rt.id,
  securityListIds: [sl.id],
  prohibitPublicIpOnVnic: false,
});

// --- cloud-init ------------------------------------------------------------

function envFile(args: {
  host: string;
  authSecret: string;
  postgresPassword: string;
  minioRootUser: string;
  minioRootPassword: string;
  anthropicApiKey: string;
  imageTag: string;
}): string {
  return [
    `TIDE_HOST=${args.host}`,
    `LETSENCRYPT_EMAIL=${leEmail}`,
    `TIDE_IMAGE_TAG=${args.imageTag}`,
    `AUTH_SECRET=${args.authSecret}`,
    `POSTGRES_PASSWORD=${args.postgresPassword}`,
    `MINIO_ROOT_USER=${args.minioRootUser}`,
    `MINIO_ROOT_PASSWORD=${args.minioRootPassword}`,
    `ANTHROPIC_API_KEY=${args.anthropicApiKey}`,
    'ANTHROPIC_MODEL=claude-haiku-4-5-20251001',
    'FLAG_LISTEN_MODE=1',
    'FLAG_PUBLIC_SHARING=1',
  ].join('\n');
}

const userDataB64 = pulumi
  .all([authSecret, postgresPassword, minioRootPassword, anthropicApiKey])
  .apply(([as, pp, mrp, ak]) => {
    const env = envFile({
      host,
      authSecret: as,
      postgresPassword: pp,
      minioRootUser,
      minioRootPassword: mrp,
      anthropicApiKey: ak,
      imageTag: tideImageTag,
    });

    const script = `#cloud-config
package_update: true
package_upgrade: true
packages:
  - docker.io
  - docker-compose-plugin
  - git
  - curl
write_files:
  - path: /opt/tide/.env
    permissions: '0600'
    owner: root:root
    content: |
${env
  .split('\n')
  .map((l) => `      ${l}`)
  .join('\n')}
runcmd:
  - systemctl enable --now docker
  - mkdir -p /opt/tide /var/lib/tide
  - git clone --branch ${repoBranch} --depth 1 https://github.com/mateokadiu/tide.git /opt/tide/repo
  - cp /opt/tide/repo/infra/docker/docker-compose.yml /opt/tide/docker-compose.yml
  - cd /opt/tide && docker compose --env-file .env -f docker-compose.yml up -d
`;
    return Buffer.from(script, 'utf8').toString('base64');
  });

// --- compute ---------------------------------------------------------------

const instance = new oci.core.Instance('tide-vm', {
  compartmentId,
  availabilityDomain: ad,
  shape: 'VM.Standard.A1.Flex',
  shapeConfig: { ocpus: 2, memoryInGbs: 12 },
  sourceDetails: { sourceId: imageId, sourceType: 'image' },
  createVnicDetails: {
    subnetId: subnet.id,
    assignPublicIp: 'true',
  },
  metadata: {
    ssh_authorized_keys: sshPublicKey,
    user_data: userDataB64,
  },
  displayName: 'tide',
});

// --- outputs ---------------------------------------------------------------

export const publicIp = instance.publicIp;
export const dnsTarget = pulumi.interpolate`${host} → ${instance.publicIp}`;
