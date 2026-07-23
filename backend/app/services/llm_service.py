"""
LLM Service — Mock Implementation

This module provides LLM-powered code explanation and test generation.
The mock implementation returns realistic-looking fake outputs.

To swap in a real implementation, replace `explain_code()` and
`generate_tests()` with functions that call a real LLM API
(e.g. OpenAI, Anthropic, local model). The function signatures
and return types MUST stay the same.
"""


def explain_code(code: str, language: str | None = None) -> dict:
    """
    Generate a human-readable explanation of the given code.

    Args:
        code: Source code string to explain.
        language: Programming language (auto-detected if None).

    Returns:
        A dict with keys 'explanation' and 'language_detected'.

    # TODO: replace with real model/API call
    # Real implementation would:
    #   1. Send the code to an LLM (GPT-4, Claude, Gemini, etc.)
    #   2. Prompt it to explain the code in plain English
    #   3. Return the explanation text
    """

    # --- MOCK DATA ---
    detected_lang = language or _detect_language(code)

    explanation = (
        f"This {detected_lang} code defines a function that processes input data "
        f"through several steps:\n\n"
        f"1. **Input Validation**: The function first checks that the input "
        f"parameters are valid and raises appropriate errors for invalid inputs.\n\n"
        f"2. **Data Transformation**: It then transforms the input data by applying "
        f"a series of operations — filtering out invalid entries, normalizing values, "
        f"and structuring the results into the expected output format.\n\n"
        f"3. **Error Handling**: The function includes try/except blocks to gracefully "
        f"handle potential runtime errors, logging issues and returning sensible "
        f"defaults when operations fail.\n\n"
        f"4. **Return Value**: Finally, it returns the processed data as a "
        f"dictionary/object containing the transformed results along with metadata "
        f"about the processing (e.g., count of items processed, any warnings).\n\n"
        f"**Key observations**: The code follows a clean separation of concerns "
        f"pattern, making it easy to test individual steps independently."
    )

    return {
        "explanation": explanation,
        "language_detected": detected_lang,
    }


def generate_tests(code: str, language: str | None = None, framework: str | None = None) -> dict:
    """
    Generate unit test code for the given source code.

    Args:
        code: Source code string to generate tests for.
        language: Programming language (auto-detected if None).
        framework: Test framework to use (auto-selected if None).

    Returns:
        A dict with keys 'test_code', 'framework', and 'num_tests'.

    # TODO: replace with real model/API call
    # Real implementation would:
    #   1. Send the code to an LLM with a test-generation prompt
    #   2. Parse the generated test code
    #   3. Optionally validate that the tests are syntactically correct
    #   4. Return the test code
    """

    # --- MOCK DATA ---
    detected_lang = language or _detect_language(code)
    selected_framework = framework or _default_framework(detected_lang)

    if detected_lang == "javascript" or detected_lang == "typescript":
        test_code = _mock_jest_tests()
    else:
        test_code = _mock_pytest_tests()

    return {
        "test_code": test_code,
        "framework": selected_framework,
        "num_tests": 3,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _detect_language(code: str) -> str:
    """Simple heuristic language detection based on keywords."""
    code_lower = code.lower()
    if "def " in code_lower or "import " in code_lower:
        return "python"
    if "function " in code_lower or "const " in code_lower or "=>" in code_lower:
        return "javascript"
    if "public class " in code_lower or "public static void" in code_lower:
        return "java"
    return "python"  # default


def _default_framework(language: str) -> str:
    """Return the default test framework for a language."""
    frameworks = {
        "python": "pytest",
        "javascript": "jest",
        "typescript": "jest",
        "java": "junit",
    }
    return frameworks.get(language, "pytest")


def _mock_pytest_tests() -> str:
    """Return a realistic-looking pytest test suite."""
    return '''import pytest
from mymodule import process_data, validate_input, transform_records


class TestProcessData:
    """Tests for the process_data function."""

    def test_process_data_with_valid_input(self):
        """Test that valid input is processed correctly."""
        input_data = [
            {"id": 1, "value": "hello", "active": True},
            {"id": 2, "value": "world", "active": True},
        ]
        result = process_data(input_data)

        assert result is not None
        assert len(result["items"]) == 2
        assert result["metadata"]["total_processed"] == 2
        assert result["metadata"]["warnings"] == []

    def test_process_data_filters_inactive_records(self):
        """Test that inactive records are filtered out."""
        input_data = [
            {"id": 1, "value": "keep", "active": True},
            {"id": 2, "value": "skip", "active": False},
            {"id": 3, "value": "keep", "active": True},
        ]
        result = process_data(input_data)

        assert len(result["items"]) == 2
        assert all(item["active"] for item in result["items"])

    def test_process_data_handles_empty_input(self):
        """Test graceful handling of empty input."""
        result = process_data([])

        assert result["items"] == []
        assert result["metadata"]["total_processed"] == 0


class TestValidateInput:
    """Tests for input validation."""

    def test_validate_input_raises_on_none(self):
        """Test that None input raises ValueError."""
        with pytest.raises(ValueError, match="Input cannot be None"):
            validate_input(None)

    def test_validate_input_accepts_valid_data(self):
        """Test that valid data passes validation."""
        assert validate_input([{"id": 1}]) is True
'''


def _mock_jest_tests() -> str:
    """Return a realistic-looking Jest test suite."""
    return '''const { processData, validateInput, transformRecords } = require('./mymodule');

describe('processData', () => {
  test('should process valid input correctly', () => {
    const input = [
      { id: 1, value: 'hello', active: true },
      { id: 2, value: 'world', active: true },
    ];
    const result = processData(input);

    expect(result).not.toBeNull();
    expect(result.items).toHaveLength(2);
    expect(result.metadata.totalProcessed).toBe(2);
    expect(result.metadata.warnings).toEqual([]);
  });

  test('should filter inactive records', () => {
    const input = [
      { id: 1, value: 'keep', active: true },
      { id: 2, value: 'skip', active: false },
      { id: 3, value: 'keep', active: true },
    ];
    const result = processData(input);

    expect(result.items).toHaveLength(2);
    result.items.forEach(item => {
      expect(item.active).toBe(true);
    });
  });

  test('should handle empty input gracefully', () => {
    const result = processData([]);

    expect(result.items).toEqual([]);
    expect(result.metadata.totalProcessed).toBe(0);
  });
});
'''
