"""
Bug Detector Service — Mock Implementation

This module provides static analysis / bug detection functionality.
The mock implementation returns realistic-looking fake bug reports.

To swap in a real implementation, replace the `detect_bugs()` function
with one that uses a real ML model or static analysis engine.
The function signature and return type MUST stay the same.
"""

from app.models.schemas import Bug, BugSeverity


def detect_bugs(code: str, language: str | None = None, filename: str | None = None) -> list[Bug]:
    """
    Analyze source code and detect potential bugs / code smells.

    Args:
        code: Source code string to analyze.
        language: Programming language (auto-detected if None).
        filename: Optional filename for additional context.

    Returns:
        A list of Bug objects describing detected issues.

    # TODO: replace with real model/API call
    # Real implementation would:
    #   1. Parse the code into an AST
    #   2. Run a trained bug-detection model (e.g. CodeBERT fine-tuned for defects)
    #   3. Optionally combine with traditional static analysis rules
    #   4. Return detected issues with line numbers and severity
    """

    # --- MOCK DATA ---
    # These fake bugs simulate what a real bug detector would return.
    # The line numbers are based on typical patterns in the submitted code.
    lines = code.strip().split("\n")
    num_lines = len(lines)

    mock_bugs = [
        Bug(
            line=min(3, num_lines),
            column=5,
            severity=BugSeverity.ERROR,
            message="Potential null reference: variable 'result' may be None before use",
            rule_id="NULL_REF_001",
            suggestion="Add a null check before accessing 'result': if result is not None:",
        ),
        Bug(
            line=min(7, num_lines),
            column=1,
            severity=BugSeverity.WARNING,
            message="Unused variable 'temp_data' — assigned but never read",
            rule_id="UNUSED_VAR_002",
            suggestion="Remove the unused variable or prefix with underscore: _temp_data",
        ),
        Bug(
            line=min(12, num_lines),
            column=10,
            severity=BugSeverity.INFO,
            message="Consider using a context manager ('with' statement) for file operations",
            rule_id="RESOURCE_MGMT_003",
            suggestion="Replace open()/close() with: with open(filename) as f:",
        ),
    ]

    # Only return bugs whose line numbers are within the actual code
    return [bug for bug in mock_bugs if bug.line <= num_lines]
