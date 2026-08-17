---
kind: lab
title: How Agentic troubleshooting works in OpenShift
description: Follow an OpenShift alert through Agentic analysis, approval-gated remediation, and verification, then learn how the components connect.
publishedDate: 2026-08-17
updatedDate: 2026-08-17
topic: agentic-lightspeed
tags:
  - OpenShift
  - OpenShift Lightspeed
  - Agentic troubleshooting
  - AgenticRun
  - alerts adapter
difficulty: beginner
estimatedMinutes: 16
testedVersions:
  - OpenShift 5.0.0-ec.5
prerequisites:
  - Access to the prepared OpenShift 5 Early Access showroom environment.
  - Access to the OpenShift web console and the oc command-line interface.
  - Permission to view alerts and Agentic resources in openshift-lightspeed.
  - Permission to edit ConfigMap/alerts-adapter-config and restart its Deployment for the alert-triggered exercise.
draft: false
featured: true
---

Last updated: 2026-08-17

An OpenShift alert tells you that something is wrong, but it does not always explain the cause or the safest next step. An administrator still needs to collect evidence, connect symptoms, review a possible repair, and confirm that the system recovered.

Agentic troubleshooting connects those activities through visible Kubernetes resources. It can investigate an eligible alert, present a proposed action for review, run an approved change with scoped permissions, and check the workload again.

In this article, you will first follow the [OpenShift 5 Early Access showroom exercise](https://rhpds.github.io/ocp5-ea-showroom/modules/agentic-troubleshooting.html). Then, you will learn what happens behind the scenes and how to read the Alerts Adapter configuration.

> [!IMPORTANT]
> This is OpenShift 5 Early Access behavior, not a generally available production workflow. The example was live-verified on a disposable OpenShift `5.0.0-ec.5` cluster on August 14, 2026. Perform the optional remediation only in an authorized lab.

## Prepare your environment

For this article, you need the following prerequisites:

- Access to the prepared OpenShift 5 Early Access showroom environment.

- Access to the OpenShift web console and the `oc` command-line interface.

- Permission to view alerts and Agentic resources in `openshift-lightspeed`.

- Permission to edit `ConfigMap/alerts-adapter-config` and restart its Deployment for the alert-triggered exercise.

The showroom already provides the sample applications, monitoring rules, Alerts Adapter, Agentic Operator, sandbox configuration, and deliberate payment failure used here. If you are working in another cluster, resource names and behavior might differ.

## Follow the Agentic troubleshooting exercise

The showroom contains two related experiences:

- Exercises 1-3 use OpenShift Lightspeed chat to investigate a timeout, a critical alert, and metrics. You start these conversations yourself.

- Exercise 4 enables alert-triggered Agentic troubleshooting. This is where the Alerts Adapter, `AgenticRun`, and sandbox pods enter the story.

The rest of this article follows Exercise 4.

### Confirm the incident

In the OpenShift web console, check that the sample applications are unhealthy and that `PaymentErrorRateHigh` is firing. This matters because the Agentic workflow should explain real cluster evidence, not a hypothetical problem.

In this lab, the expected failure chain is:

    reporting-service v1.0.2 leaks database connections
            -> PostgreSQL runs out of normal connection slots
            -> payments-api cannot connect to PostgreSQL
            -> payment requests return HTTP 503
            -> PaymentErrorRateHigh fires

That is the lab’s expected answer, not a diagnosis to reuse on another cluster. On another cluster, trust its logs, events, metrics, and recent changes.

### Allow the adapter to process the alert

The EAP adapter starts with no allowed receivers. Therefore, firing alerts do not create runs until an administrator opts in a receiver.

Back up the current adapter payload, edit it, and restart the adapter:

``` bash
oc -n openshift-lightspeed get configmap alerts-adapter-config \
  -o jsonpath='{.data.config\.yaml}' \
  > /tmp/alerts-adapter-config.before.yaml

oc -n openshift-lightspeed edit configmap alerts-adapter-config

oc -n openshift-lightspeed rollout restart \
  deployment/lightspeed-agentic-alerts-adapter
```

Under `filtering.allowedReceivers`, enable `critical`:

``` yaml
filtering:
  allowedReceivers:
    - critical
```

`critical` is an **Alertmanager receiver name**. It is not an alert name and it is not a request to process only the `PaymentErrorRateHigh` alert. Any eligible alert routed to this receiver can create a run. In the live experiment, the payment alert and an unrelated `ClusterOperatorDown` alert both produced runs.

### Open the generated investigation

After the next adapter poll, go to **Administrator → Agentic Runs → Agentic runs**. Open the run for `PaymentErrorRateHigh`.

The run first shows that analysis is in progress. When analysis finishes, it moves to a proposed state and displays the diagnosis, evidence, and remediation options. At this point, the workload has **not** been changed.

The same objects are visible from the CLI:

``` bash
oc -n openshift-lightspeed get agenticruns

export ALERT_RUN="replace-with-payment-run-name"
oc -n openshift-lightspeed get agenticrun "$ALERT_RUN" -o yaml
oc -n openshift-lightspeed get analysisresults \
  -l agentic.openshift.io/run="$ALERT_RUN"
```

Look at `spec.targetNamespaces`, `status.conditions`, and `status.steps.analysis.results`. They show the investigation boundary, progress, and the durable analysis result.

### Review, approve, and verify the optional remediation

In the lab, review the proposed rollback of `reporting-service` to `v1.0.1`. Check the evidence, exact target, commands, requested permissions, rollback plan, and verification plan before selecting **Execute remediation** and confirming the action.

The lab policy makes analysis automatic, execution manual, and verification automatic. Therefore:

1.  An analysis sandbox investigates and proposes options.

2.  The workflow stops at the approval gate.

3.  Your approval selects one option; it does not grant unrestricted cluster access.

4.  An execution sandbox receives temporary RBAC for the selected action.

5.  A different verification sandbox checks the workload again.

In the live experiment, the execution identity could patch only `deployment/reporting-service` and read its ReplicaSets. It could not patch `payments-api` or list Secrets. Verification then confirmed image `v1.0.1`, readiness `1/1`, recovered HTTP responses, and cleared payment alerts.

Finally, verify the cluster yourself. A successful agent response is evidence, but it is not the only evidence:

``` bash
oc -n payments get deployment reporting-service
oc -n payments logs deployment/payments-api --since=2m

oc -n openshift-lightspeed get executionresults,verificationresults \
  -l agentic.openshift.io/run="$ALERT_RUN"
```

Restore the exact adapter configuration that you backed up so future alerts do not start more lab runs:

``` bash
oc -n openshift-lightspeed set data \
  configmap/alerts-adapter-config \
  --from-file=config.yaml=/tmp/alerts-adapter-config.before.yaml

oc -n openshift-lightspeed rollout restart \
  deployment/lightspeed-agentic-alerts-adapter
```

Review every run created while `critical` was enabled. Deny an unintended proposed run; do not approve it merely to clear the list.

## Understand what happens behind the scenes

Here is the entire flow. The Kubernetes API is the handoff point between the adapter and the Agentic Operator.

<div>

<div class="title">

Figure 1: Alert-triggered Agentic troubleshooting flow

</div>

    Prometheus / Thanos Ruler
            |
            | evaluates rules
            v
    Alertmanager
            |
            | 1. polled by
            v
    Agentic Alerts Adapter
            |
            | 2. creates
            v
    --------------------- KUBERNETES API HANDOFF ---------------------
    AgenticRun
            |
            | 3. watched by
            v
    Lightspeed Agentic Operator
            |
            | 4. creates one temporary worker for each required stage
            v
    Analysis sandbox -> APPROVAL GATE -> Execution sandbox -> Verification sandbox
            |
            +---- results and conditions return to the Kubernetes API

</div>

Read the numbered arrows as four simple roles:

1.  **Translator — Agentic Alerts Adapter:** Polls Alertmanager, filters the firing alerts, and translates each eligible alert into an `AgenticRun`.

2.  **Work order — AgenticRun:** Stores what should be investigated and records the workflow’s progress. It is a Kubernetes object, not a running program.

3.  **Coordinator — Lightspeed Agentic Operator:** Watches the `AgenticRun` and advances it through analysis, approval, execution, and verification.

4.  **Temporary workers — sandbox pods:** Perform one stage at a time and return structured results. The Operator records those results and conditions in the Kubernetes API.

The most important connection is also the easiest to miss: **the Alerts Adapter does not connect directly to a sandbox pod**. The Kubernetes API is the handoff point. The adapter creates the work order, and the Operator sees that work order and creates the required workers.

### Agentic Alerts Adapter: the translator

Think of the adapter as an intake clerk. The [Alerts Adapter repository](https://github.com/openshift/lightspeed-agentic-alerts-adapter) includes `ARCHITECTURE.md`, which explains the design; in plain language, the adapter:

1.  polls the in-cluster Alertmanager API for firing alerts;

2.  filters alerts by receiver, severity, delay, and previous runs;

3.  converts each eligible alert into one `AgenticRun` in `openshift-lightspeed`.

Polling lets the adapter rediscover an alert that is still firing after a restart. On every poll, it reads current alerts and existing runs instead of keeping its own database. After it creates a run, the Agentic Operator owns the remaining workflow.

The adapter copies useful alert context into the run: alert name, severity, summary, start time, fingerprints, affected namespace, and an investigation request. It also adds the configured agent and skill settings.

The adapter does **not** diagnose the incident, call the large language model (LLM), create a sandbox, approve a proposal, or change the workload.

#### Read the adapter Deployment YAML

The adapter’s `Deployment` answers *where and how the adapter runs*. The `alerts-adapter-config` ConfigMap, explained later, answers *which alerts it handles and how often it checks*. Keeping those jobs separate makes both files easier to understand.

The following example is simplified from the `ARCHITECTURE.md` deployment in the [Alerts Adapter repository](https://github.com/openshift/lightspeed-agentic-alerts-adapter) and cross-checked against the Early Access deployment template. It shows the connections that matter for this walkthrough; it is not intended to replace the installation manifest:

``` yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lightspeed-agentic-alerts-adapter
  namespace: openshift-lightspeed
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lightspeed-agentic-alerts-adapter
  template:
    metadata:
      labels:
        app: lightspeed-agentic-alerts-adapter
    spec:
      serviceAccountName: lightspeed-agentic-alerts-adapter
      containers:
        - name: adapter
          image: quay.io/openshift-lightspeed/lightspeed-agentic-alerts-adapter:latest
          env:
            - name: ALERTMANAGER_URL
              value: https://alertmanager-main.openshift-monitoring.svc:9094
          volumeMounts:
            - name: config
              mountPath: /etc/alerts-adapter
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: alerts-adapter-config
```

| Important field | Why it matters |
|----|----|
| `namespace:` `openshift-lightspeed` | Places the adapter beside the Agentic components in the EAP environment. |
| `replicas:` `1` | Runs one adapter pod. One is sufficient for this stateless polling design because a restarted pod rebuilds its view from Alertmanager and the Kubernetes API. |
| `selector.matchLabels` and `template.metadata.labels` | The matching label lets the Deployment identify and manage its pod. |
| `serviceAccountName` | Gives the pod its Kubernetes identity. Separate RBAC grants that identity permission to read alerts and create or list `AgenticRun` objects. |
| `image` | Selects the adapter program to run. The installation supplies the actual image; `latest` above is the readable value used by the pinned architecture example. |
| `ALERTMANAGER_URL` | Points the adapter to Alertmanager’s in-cluster service. This is the source that the adapter polls for firing alerts. |
| `configMap`, `mountPath`, and `readOnly` | Mount `alerts-adapter-config` inside the container at `/etc/alerts-adapter` without allowing the container to change it. |

This YAML starts the translator, but it does not choose the `critical` receiver. That choice lives in the ConfigMap you edit during the exercise.

### AgenticRun: the work order

An `AgenticRun` is a Kubernetes custom resource. It is data stored in the Kubernetes API, not a process or a pod.

Think of its two halves this way:

| Area | Meaning |
|----|----|
| `spec` | The work order: the request, target namespace, analysis/execution/verification stages, agents, and skills. |
| `status` | The progress record: conditions and references to `AnalysisResult`, `ExecutionResult`, and `VerificationResult` objects. |

The adapter creates the work order. The Agentic Operator continually updates its progress.

### Lightspeed Agentic Operator: the coordinator

The Lightspeed Agentic Operator is a Kubernetes controller. It watches `AgenticRun` objects and repeatedly compares the requested work in `spec` with the progress recorded in `status`.

For each run, the Operator determines the next required stage, creates or waits for the appropriate sandbox, stores the returned result, and updates the run’s conditions. It also manages the approval object and the temporary execution RBAC. In this lab, analysis starts automatically, execution waits for your approval, and verification starts automatically after execution.

The Operator coordinates the workflow; it does not perform the investigation or remediation itself. That work happens inside the sandbox pods.

#### How the ApprovalPolicy controls the gates

The [Agentic Operator](https://github.com/openshift/lightspeed-agentic-operator) reads an `ApprovalPolicy` to decide whether each stage can start automatically or must wait for a person. The effective stage decisions in this Early Access exercise are:

``` yaml
apiVersion: agentic.openshift.io/v1alpha1
kind: ApprovalPolicy
metadata:
  name: cluster
  namespace: openshift-lightspeed
spec:
  stages:
    - name: Analysis
      approval: Automatic
    - name: Execution
      approval: Manual
    - name: Verification
      approval: Automatic
```

`Automatic` allows the Operator to begin that stage when the preceding requirements are complete. `Manual` pauses the workflow for an administrator’s decision. Therefore, this lab analyzes the alert automatically, waits at the approval gate before executing a change, and verifies an approved execution automatically. The policy controls *when* a stage can start; it does not choose the remediation or grant its Kubernetes permissions.

### Sandbox pods: the temporary workers

A sandbox pod is an isolated runtime for one workflow stage. It receives:

- an agent definition and LLM connection;

- a procedure called a skill, such as [`investigate-alert`](https://github.com/openshift/agentic-skills/tree/main/cluster-troubleshoot/investigate-alert);

- a ServiceAccount whose RBAC determines which Kubernetes actions are allowed;

- the request and context for the current run.

| Stage or gate | What happens |
|----|----|
| Analysis sandbox | Collects the cluster evidence permitted by its ServiceAccount, asks the LLM to reason over that evidence, and returns a diagnosis and possible remediation options. It does not receive the temporary execution RBAC. |
| Approval gate | This is a decision point, not a pod. The workflow waits for an administrator to review the proposal and select or deny an action when execution requires manual approval. |
| Execution sandbox | Runs only the selected, approved remediation with temporary RBAC generated for that action. |
| Verification sandbox | Starts as a separate worker after execution and checks the workload again. It returns structured checks and a pass or fail result. |

The Agentic Operator waits for the sandbox service to become ready and sends it the current stage request. The sandbox uses its configured agent, skill, tools, and permissions, then returns structured output. The Operator stores that output in a typed result object.

Analysis, execution, and verification use separate temporary workers. A skill tells the worker *how* to investigate; RBAC decides what it is *allowed* to read or change. The temporary pods and execution RBAC can be removed after the run, while the result objects remain as an inspectable record.

## Understand the Alerts Adapter configuration

The file has **two YAML levels**:

1.  The outer YAML creates a Kubernetes `ConfigMap`.

2.  `data.config.yaml` is a text value containing the adapter’s own YAML.

This is the effective EAP configuration after enabling the `critical` receiver, with comments removed for readability:

``` yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alerts-adapter-config
  namespace: openshift-lightspeed
data:
  config.yaml: |
    pollInterval: 30s
    postRunDelay: 1h
    filtering:
      allowedReceivers:
        - critical
    analysis:
      tools:
        skills:
          - image: quay.io/openshiftanalytics/agentic-skills:latest
            paths:
              - /skills/cluster-troubleshoot/investigate-alert
```

### The outer ConfigMap

| Field | Meaning |
|----|----|
| `apiVersion:` `v1` | Uses the core Kubernetes API version for a ConfigMap. |
| `kind:` `ConfigMap` | Stores non-secret configuration. Credentials belong in a Secret, not here. |
| `metadata.name` | Names the object `alerts-adapter-config`, which is the ConfigMap expected by this deployment. |
| `metadata.namespace` | Places it beside the adapter in `openshift-lightspeed`. |
| `data` | Begins the ConfigMap’s key/value data. |
| `config.yaml` | Creates a key named `config.yaml`. In the YAML example, the block marker after the colon means that the following indented lines are stored as one multiline string. The adapter parses that string as a second YAML document. |

The GitOps source also contains Helm and Argo CD metadata. `{{` `if` `.Values.agentic.enabled` `}}` conditionally renders the ConfigMap, `{{` `.Values.namespace` `}}` is replaced during Helm rendering, `sync-wave:` `"4"` controls Argo CD ordering, and `Prune=false` prevents Argo CD from pruning this ConfigMap. These are deployment instructions; the adapter does not read them as runtime settings.

### The inner `config.yaml`

| Field and EAP value/default | What it controls |
|----|----|
| `pollInterval` (`30s`) | How often the adapter asks Alertmanager for firing alerts. It controls discovery frequency, not how long analysis takes. |
| `preRunDelay` (absent; default `0s`) | How long an alert must stay active before a run can be created. The EAP template shows `5m` only as a commented example. A delay can avoid investigating short-lived alerts. |
| `postRunDelay` (`1h`) | After a matching run becomes Completed, Failed, Denied, or Escalated, waits this long before another run for the same stable fingerprint can be created. |
| `filtering` (section) | Groups alert-selection settings. |
| `filtering.allowedReceivers` (empty until the lab enables `critical`) | Case-insensitive allowlist of Alertmanager receiver names. Empty means no runs. If an alert has several receivers, one match is enough. The adapter separately skips alerts whose severity is `none` or `info`. |
| `deduplication` (optional section) | Groups settings used to decide whether two alert occurrences represent the same underlying problem. |
| `deduplication.ignoredLabels` (absent; defaults to `pod`, `instance`, `endpoint`, `uid`) | Removes volatile labels before calculating a stable fingerprint. This prevents a restarted pod name from looking like a new problem. A configured list replaces the defaults; `[]` includes every label. |
| `tools.skills` (absent) | Optional skills shared by all run stages. Each list item needs an OCI `image` and one or more `paths` inside that image. |
| `agent.default` (absent; resolves to `default`) | Optional agent name for all stages. |
| `agent.analysis`, `agent.execution`, `agent.verification` (absent) | Optional per-stage agent names. A per-stage value overrides `agent.default`. |
| `analysis.tools.skills` (one `investigate-alert` skill) | Adds a skill only to the generated run’s analysis step. A per-step tool setting replaces shared tools for that step. |
| `analysis.tools.skills[].image` (`quay.io/openshiftanalytics/agentic-skills:latest`) | OCI image that contains the skill files. For repeatable environments, a release process should prefer an approved immutable reference over a moving tag. |
| `analysis.tools.skills[].paths` (`/skills/cluster-troubleshoot/investigate-alert`) | Directory copied or mounted from the skills image for the analysis worker. |
| `execution.tools.skills`, `verification.tools.skills` (absent) | Optional per-stage skill overrides. The EAP template contains commented examples, so the adapter adds no such override to these stages unless an administrator enables one. |

Comments beginning with the hash symbol (#) are documentation and are ignored by the YAML parser. Therefore, the commented `preRunDelay` example does not enable a five-minute delay, and the commented `critical` entry does not allow that receiver.

### How these fields become an AgenticRun

For each eligible alert, the adapter builder performs a predictable translation:

| Input | Generated run field |
|----|----|
| Alert name, severity, fingerprints, start time, and summary | Run name, labels, and annotations for traceability and deduplication |
| Alert `namespace` label | `spec.targetNamespaces`; the `AgenticRun` object itself remains in `openshift-lightspeed` |
| Alert details | A sanitized `spec.request` asking the analysis agent to investigate |
| `agent.*` | `spec.analysis.agent`, `spec.execution.agent`, and `spec.verification.agent` |
| Shared `tools.skills` | `spec.tools.skills` |
| Per-step tool configuration | `spec.analysis.tools`, `spec.execution.tools`, or `spec.verification.tools` |

This `AgenticRun` is the contract between the adapter and the Agentic Operator. That API handoff is why the two components can evolve independently and why you can inspect the workflow with ordinary Kubernetes tools.

## Final thoughts

Agentic troubleshooting is a chain of visible, controlled handoffs. The adapter decides which alerts can start an investigation, the Kubernetes API carries the work order, and the Agentic Operator coordinates temporary workers. Human approval and Kubernetes RBAC limit the optional change, while a separate verification stage checks whether the system recovered.

This article describes an Early Access workflow. Begin with automatic analysis, review the evidence critically, and perform remediation only in an authorized disposable environment. To try the complete experience, follow the [OpenShift 5 Early Access Agentic troubleshooting exercise](https://rhpds.github.io/ocp5-ea-showroom/modules/agentic-troubleshooting.html).

## Learn more

- [OpenShift 5 Early Access Agentic troubleshooting exercise](https://rhpds.github.io/ocp5-ea-showroom/modules/agentic-troubleshooting.html)

- [Alerts Adapter repository: open `README.md` for configuration and `ARCHITECTURE.md` for the design](https://github.com/openshift/lightspeed-agentic-alerts-adapter)

- [Lightspeed Agentic Operator repository](https://github.com/openshift/lightspeed-agentic-operator)

- [Lightspeed Agentic Sandbox repository](https://github.com/openshift/lightspeed-agentic-sandbox)

- [`investigate-alert` skill](https://github.com/openshift/agentic-skills/tree/main/cluster-troubleshoot/investigate-alert)

The implementation paths reviewed for this article include `ARCHITECTURE.md`, `internal/adapter/adapter.go`, `internal/agenticrun/build.go`, `api/v1alpha1/approvalpolicy_types.go`, `controller/agenticrun/sandbox_agent.go`, `controller/agenticrun/rbac.go`, and `src/lightspeed_agentic/routes/query.py`. For the run namespace, the article follows the executable Early Access builder and the live observation: runs are in `openshift-lightspeed`, while `spec.targetNamespaces` carries the affected namespace. The complete analysis-to-approval-to-execution-to-verification path, recovery checks, temporary RBAC boundary, and cleanup were also observed in the disposable Early Access cluster described at the beginning of this article.
