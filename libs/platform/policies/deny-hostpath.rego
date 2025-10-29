package main

deny[msg] {
  input.kind == "Pod"
  volume := input.spec.volumes[_]
  volume.hostPath
  msg := sprintf("hostPath volumes are not allowed: %q", [volume.name])
}

deny[msg] {
  input.kind == "Deployment"
  volume := input.spec.template.spec.volumes[_]
  volume.hostPath
  msg := sprintf("hostPath volumes are not allowed: %q", [volume.name])
}

deny[msg] {
  input.kind == "StatefulSet"
  volume := input.spec.template.spec.volumes[_]
  volume.hostPath
  msg := sprintf("hostPath volumes are not allowed: %q", [volume.name])
}

deny[msg] {
  input.kind == "DaemonSet"
  volume := input.spec.template.spec.volumes[_]
  volume.hostPath
  msg := sprintf("hostPath volumes are not allowed: %q", [volume.name])
}

deny[msg] {
  input.kind == "Job"
  volume := input.spec.template.spec.volumes[_]
  volume.hostPath
  msg := sprintf("hostPath volumes are not allowed: %q", [volume.name])
}

deny[msg] {
  input.kind == "CronJob"
  volume := input.spec.jobTemplate.spec.template.spec.volumes[_]
  volume.hostPath
  msg := sprintf("hostPath volumes are not allowed: %q", [volume.name])
}
