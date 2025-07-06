{{/* /charts/wordpress-ionkube/templates/_helpers.tpl */}}
{{- define "wordpress-ionkube.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "wordpress-ionkube.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- /* Add your own SaaS platform labels for billing/metering */}}
saas.platform.com/user-id: {{ .Values.platform.userId | quote }}
saas.platform.com/deployment-id: {{ .Release.Name | quote }}
{{- end -}}