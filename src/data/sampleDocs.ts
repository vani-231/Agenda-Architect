export interface SampleDoc {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultMinutes: number;
  content: string;
}

export const SAMPLE_DOCS: SampleDoc[] = [
  {
    id: 'product-q3-roadmap',
    name: 'Q3_Product_Roadmap_Proposal.md',
    category: 'Product & Engineering',
    description: 'Feature prioritization, AI assistant rollout, and engineering constraints for next quarter.',
    defaultMinutes: 45,
    content: `# Q3 Product Roadmap & Architectural Direction

## Executive Summary
As we transition into Q3, our primary objective is closing the workflow loop on AI-powered team insights while resolving critical tech debt on our backend database query latency. 

## Key Initiatives
### 1. Unified Intelligence Search (Priority 1)
- Enables semantic retrieval across user documents, past agendas, and team tickets.
- Tech Stack: Vector embeddings pipeline with Google Gemini and Cloud SQL pgvector.
- Dependencies: Data privacy approval from Legal (Elena Vance) and DevOps capacity from Infrastructure (Marcus Cole).
- Open question: Should we release a beta to Tier-1 accounts in August or wait for the full SOC-2 audit in September?

### 2. Multi-tenant Billing & Usage Tier Revamp (Priority 2)
- Rebuilding Stripe checkout flow to support seat-based + token usage metering.
- Finance team (David Chen) requested automated invoicing and 30-day usage alerts.
- Product Marketing (Aisha Morales) wants a revised landing page and tiered pricing calculator.

### 3. Latency Optimization & Database Sharding (Tech Debt)
- p99 response times spike to 1.8s during peak morning sync hours (09:00 - 11:00 EST).
- Engineering proposal: Implement Redis caching layer for hot session states and optimize read replica routing.
- Risk: Migration requires a 20-minute scheduled maintenance window.

## Proposed Meeting Goals
1. Decide whether to gate the AI search beta before or after SOC-2 sign-off.
2. Sign off on the billing threshold rules with Finance.
3. Schedule the database migration maintenance window.

## Required Stakeholders
- Product Lead: Maya Lin
- Engineering Architect: Marcus Cole
- Head of Finance: David Chen
- Product Marketing Manager: Aisha Morales
- Compliance & Security Officer: Elena Vance
`,
  },
  {
    id: 'post-mortem-sev1',
    name: 'Incident_PostMortem_SEV1_StorageCluster.md',
    category: 'Incident Review',
    description: 'Post-incident analysis of storage replication outage, RCA, and mitigation steps.',
    defaultMinutes: 30,
    content: `# Post-Mortem: SEV-1 Storage Cluster Failover Degradation

## Event Details
- Date: August 28, 2026
- Duration: 42 minutes (14:12 UTC - 14:54 UTC)
- Impact: 18% of active sessions experienced read timeouts; no permanent data corruption detected.
- Incident Commander: Jordan Rivera (SRE)

## Root Cause Analysis (RCA)
A routine node pool rolling upgrade caused network partition flaps between primary node pool 'alpha' and the multi-zone replica pool. The automated failover mechanism triggered prematurely, leading to split-brain validation lockouts.

## Immediate Fixes Implemented
- Rolled back node pool configuration to stable release v4.18.2.
- Disabled aggressive auto-failover heartbeat until quorum logic threshold was increased from 3s to 12s.
- Restored healthy read replicas by 14:54 UTC.

## Action Items & Preventative Measures
1. Infrastructure: Deploy cluster quorum arbiter across Zone C by Sept 12 (Owner: Jordan Rivera).
2. Backend Services: Implement client-side exponential backoff with jitter on replication read calls (Owner: Kevin Zhang).
3. Quality Assurance: Add multi-zone partition chaos testing to the staging CI/CD pipeline (Owner: Priya Patel).
4. Customer Support: Update customer SLA dashboard and publish transparent post-incident bulletin (Owner: Rachel Adams).

## Objectives for Incident Review Meeting
- Agree on root cause conclusions and verify if the arbiter architecture prevents recurrence.
- Validate priority and delivery timelines for engineering and SRE preventative tickets.
- Review customer messaging and SLA credit requirements.
`,
  },
  {
    id: 'client-kickoff',
    name: 'Enterprise_Client_Discovery_ApexHealth.md',
    category: 'Client & Sales',
    description: 'Enterprise healthcare onboarding scope, HIPAA compliance, and custom integration milestones.',
    defaultMinutes: 60,
    content: `# Enterprise Onboarding & Technical Discovery: Apex Health System

## Overview
Apex Health System has contracted for a 12,000-seat deployment of our enterprise management platform. The kickoff session establishes governance, milestones, integration architecture, and compliance sign-offs.

## Scope of Delivery
1. Identity & Access: SAML 2.0 / Okta SSO integration with automated SCIM provisioning.
2. Compliance & Data Governance: Dedicated HIPAA Business Associate Agreement (BAA), audit log immutability, and data retention rules (7 years).
3. Custom EHR Interface: Bi-directional HL7 / FHIR data connector for clinical notes dispatch.
4. User Training & Rollout: Staged deployment across 4 hospital campuses over 90 days.

## Key Discussion Points for Kickoff
- Confirm Apex project governance committee and weekly cadence.
- Review security questionnaire responses and sign off on network whitelisting.
- Agree on FHIR sandbox access credentials and test data requirements.
- Finalize Phase 1 pilot go-live target date (proposed: October 15, 2026).

## Attendees & Stakeholders
- Client Sponsor: Dr. Robert Taylor (Chief Medical Information Officer)
- Client IT Director: Linda Wu (Enterprise Infrastructure)
- Client Compliance Officer: Gary Thorne
- Our Account Executive: Samantha Reed
- Our Solutions Architect: Dan O'Connor
- Our Implementation Specialist: Chloe Dubois
`,
  },
];
