from dataclasses import dataclass


@dataclass(frozen=True)
class Principal:
    subject: str
    tenant: str
    groups: tuple[str, ...]
    admin: bool
