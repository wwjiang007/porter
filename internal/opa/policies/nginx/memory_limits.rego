package nginx.memory_limits

import future.keywords.if

# Policy expects input structure of form:
# values: {}

# This policy tests for the existence of memory limits as a hard constraint. We look
# for Helm values of the form:
# 
# controller:
#   resources:
#     limits:
#       cpu: 250m
#       memory: 275Mi
#     requests:
#       cpu: 250m
#       memory: 275Mi

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("NGINX ingress controller should have memory limits set", [])

allow if {
	input.values.controller.resources.limits.memory
}

POLICY_MESSAGE := sprintf("Success: NGINX ingress controller has memory limits set", []) if allow

else := sprintf("Failed: NGINX ingress controller does not have memory limits set", []) {
	true
}
