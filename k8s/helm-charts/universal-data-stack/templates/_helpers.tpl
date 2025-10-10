{{/*
Expand the name of the chart.
*/}}
{{- define "universal-data-stack.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "universal-data-stack.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "universal-data-stack.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "universal-data-stack.labels" -}}
helm.sh/chart: {{ include "universal-data-stack.chart" . }}
{{ include "universal-data-stack.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "universal-data-stack.selectorLabels" -}}
app.kubernetes.io/name: {{ include "universal-data-stack.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "universal-data-stack.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "universal-data-stack.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the name of the config map
*/}}
{{- define "universal-data-stack.configMapName" -}}
{{- include "universal-data-stack.fullname" . }}-config
{{- end }}

{{/*
Create the name of the secret
*/}}
{{- define "universal-data-stack.secretName" -}}
{{- include "universal-data-stack.fullname" . }}-secrets
{{- end }}

{{/*
Create the image name
*/}}
{{- define "universal-data-stack.image" -}}
{{- printf "%s/%s:%s" .Values.image.registry .Values.image.repository (.Values.image.tag | default .Chart.AppVersion) }}
{{- end }}

{{/*
Create the image name for a specific component
*/}}
{{- define "universal-data-stack.componentImage" -}}
{{- $component := .component -}}
{{- $image := index .Values $component "image" -}}
{{- printf "%s/%s:%s" .Values.image.registry $image.repository ($image.tag | default .Values.image.tag) }}
{{- end }}

{{/*
Create the service name for a specific component
*/}}
{{- define "universal-data-stack.componentServiceName" -}}
{{- $component := .component -}}
{{- printf "%s-%s" (include "universal-data-stack.fullname" $) $component }}
{{- end }}

{{/*
Create the deployment name for a specific component
*/}}
{{- define "universal-data-stack.componentDeploymentName" -}}
{{- $component := .component -}}
{{- printf "%s-%s" (include "universal-data-stack.fullname" $) $component }}
{{- end }}

{{/*
Create the HPA name for a specific component
*/}}
{{- define "universal-data-stack.componentHPAName" -}}
{{- $component := .component -}}
{{- printf "%s-%s" (include "universal-data-stack.fullname" $) $component }}
{{- end }}

{{/*
Create the environment variables for a specific component
*/}}
{{- define "universal-data-stack.componentEnv" -}}
{{- $component := .component -}}
{{- $values := .Values -}}
- name: NODE_ENV
  value: {{ $values.env.NODE_ENV | quote }}
- name: LOG_LEVEL
  value: {{ $values.env.LOG_LEVEL | quote }}
- name: PORT
  value: "3000"
- name: MONGODB_URI
  value: {{ $values.env.MONGODB_URI | quote }}
- name: REDIS_URL
  value: {{ $values.env.REDIS_URL | quote }}
- name: ELASTICSEARCH_URL
  value: {{ $values.env.ELASTICSEARCH_URL | quote }}
- name: CONSUL_URL
  value: {{ $values.env.CONSUL_URL | quote }}
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "universal-data-stack.fullname" $ }}
      key: jwt-secret
- name: SESSION_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "universal-data-stack.fullname" $ }}
      key: session-secret
{{- end }}

{{/*
Create the resource requirements for a specific component
*/}}
{{- define "universal-data-stack.componentResources" -}}
{{- $component := .component -}}
{{- $resources := index .Values $component "resources" -}}
{{- if $resources }}
{{- toYaml $resources }}
{{- else }}
limits:
  cpu: 500m
  memory: 512Mi
requests:
  cpu: 250m
  memory: 256Mi
{{- end }}
{{- end }}

{{/*
Create the node selector for a specific component
*/}}
{{- define "universal-data-stack.componentNodeSelector" -}}
{{- $component := .component -}}
{{- $nodeSelector := index .Values $component "nodeSelector" -}}
{{- if $nodeSelector }}
{{- toYaml $nodeSelector }}
{{- end }}
{{- end }}

{{/*
Create the affinity for a specific component
*/}}
{{- define "universal-data-stack.componentAffinity" -}}
{{- $component := .component -}}
{{- $affinity := index .Values $component "affinity" -}}
{{- if $affinity }}
{{- toYaml $affinity }}
{{- end }}
{{- end }}

{{/*
Create the tolerations for a specific component
*/}}
{{- define "universal-data-stack.componentTolerations" -}}
{{- $component := .component -}}
{{- $tolerations := index .Values $component "tolerations" -}}
{{- if $tolerations }}
{{- toYaml $tolerations }}
{{- end }}
{{- end }}