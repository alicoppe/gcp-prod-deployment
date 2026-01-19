from pathlib import Path

from app.models.hero_model import Hero
from app.models.user_model import User
from oso import Oso  # (1)


oso = Oso()  # (2)

# load classes into Oso (3)
oso.register_class(Hero)
oso.register_class(User)

polar_path = Path(__file__).with_name("authz.polar")
oso.load_files([str(polar_path)])


def is_authorized(actor: User, action: str, resource, **kwargs):
    return oso.is_allowed(actor=actor, action=action, resource=resource, **kwargs)
