package political_sphere

# OPA Policy for Political Sphere
# Evaluates changes against governance controls

import future.keywords.if
import future.keywords.in

# Allow changes that pass all required controls
allow if {
    input.mode == "safe"
    check_governance_compliance
    check_security_compliance
    check_quality_compliance
}

allow if {
    input.mode == "fast-secure"
    check_security_compliance
}

allow if {
    input.mode == "audit"
    check_full_compliance
}

allow if {
    input.mode == "r-and-d"
    check_minimal_compliance
}

# Governance checks
check_governance_compliance if {
    input.controls.GOV_01.pass
    input.controls.GOV_02.pass
}

# Security checks
check_security_compliance if {
    input.controls.SEC_01.pass
    input.controls.SEC_02.pass
}

# Quality checks
check_quality_compliance if {
    input.controls.QUAL_01.pass
    input.controls.QUAL_02.pass
}

# Full compliance for audit mode
check_full_compliance if {
    check_governance_compliance
    check_security_compliance
    check_quality_compliance
    input.controls.A11Y_01.pass
    input.controls.AI_01.pass
}

# Minimal compliance for R&D
check_minimal_compliance if {
    input.controls.SEC_01.pass
    input.controls.AI_01.pass
}
