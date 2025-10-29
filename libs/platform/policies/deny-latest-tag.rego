package main

deny[msg] {
  input.kind == "Pod"
  image := input.spec.containers[_].image
  endswith(image, ":latest")
  msg := sprintf("container %q is using the latest tag", [image])
}

deny[msg] {
  input.kind == "Deployment"
  image := input.spec.template.spec.containers[_].image
  endswith(image, ":latest")
  msg := sprintf("container %q is using the latest tag", [image])
}

deny[msg] {
  input.kind == "StatefulSet"
  image := input.spec.template.spec.containers[_].image
  endswith(image, ":latest")
  msg := sprintf("container %q is using the latest tag", [image])
}

deny[msg] {
  input.kind == "DaemonSet"
  image := input.spec.template.spec.containers[_].image
  endswith(image, ":latest")
  msg := sprintf("container %q is using the latest tag", [image])
}

deny[msg] {
  input.kind == "Job"
  image := input.spec.template.spec.containers[_].image
  endswith(image, ":latest")
  msg := sprintf("container %q is using the latest tag", [image])
}

deny[msg] {
  input.kind == "CronJob"
  image := input.spec.jobTemplate.spec.template.spec.containers[_].image
  endswith(image, ":latest")
  msg := sprintf("container %q is using the latest tag", [image])
}
