class NotFoundError(RuntimeError):
    """Entity does not exist within the current organization."""


class BusinessRuleError(RuntimeError):
    """The operation violates a domain rule (e.g. voiding twice, overpaying)."""
