package main

deny[msg] {
  input.kind == "Pod"
  input.spec.securityContext.privileged == true
  msg := "privileged pods are not allowed"
}

deny[msg] {
  input.kind == "Deployment"
  input.spec.template.spec.securityContext.privileged == true
  msg := "privileged pods are not allowed"
}

deny[msg] {
  input.kind == "StatefulSet"
  input.spec.template.spec.securityContext.privileged == true
  msg := "privileged pods are not allowed"
}

deny[msg] {
  input.kind == "DaemonSet"
  input.spec.template.spec.securityContext.privileged == true
  msg := "privileged pods are not allowed"
}

deny[msg] {
  input.kind == "Job"
  input.spec.template.spec.securityContext.privileged == true
  msg := "privileged pods are not allowed"
}

deny[msg] {
  input.kind == "CronJob"
  input.spec.jobTemplate.spec.template.spec.securityContext.privileged == true
  msg := "privileged pods are not allowed"
}
